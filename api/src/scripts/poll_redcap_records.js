/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const config = require('config');
const _ = require('lodash/fp');

const redcap = require('../services/redcap');
const logger = require('../services/logger');

const prisma = new PrismaClient();

const INTERVAL_MS = config.get('redcap.polling.interval') * 1000;
let interval = INTERVAL_MS;
const MAX_BACKOFF_MS = config.get('redcap.polling.max_backoff') * 1000;

// normal inrerval - 300
// delay to 1st retry - 600
// delay to 2nd retry - 1200
// delay to 3rd retry - 1800

async function transformRecord(record) {
  try {
    const requester_email = record[config.get('redcap.form_keys.requester_email')];

    const cohort_id = record[config.get('redcap.form_keys.cohort_id')];

    const reviewer_email = record[config.get('redcap.form_keys.approver_email')]
    || record[config.get('redcap.form_keys.revoker_email')];

    const decision_date = record[config.get('redcap.form_keys.apporved_date')]
    || record[config.get('redcap.form_keys.revoked_date')];

    const rejection_reason = record[config.get('redcap.form_keys.rejection_reason')];

    const decision = record[config.get('redcap.form_keys.decision')];
    let notes = '';

    let status;
    if (decision === '1') {
      status = 'APPROVED';
    } else if (decision === '0') {
      status = 'REJECTED';
    } else {
      status = 'PENDING';
    }

    const requester = await prisma.user.findUnique({
      where: {
        email: requester_email,
        is_deleted: false,
      },
    });
    if (!requester) {
      logger.error(`Requester not found: ${requester_email}`);
      return null;
    }

    const reviewer = await prisma.user.findUnique({
      where: {
        email: reviewer_email,
        is_deleted: false,
      },
    });
    if (!reviewer) {
      logger.error(`Reviewer not found: ${reviewer_email}`);
      notes += `\nReviewer: ${reviewer_email}\n`;
    }

    const cohort = await prisma.cohort.findUnique({
      where: {
        id: cohort_id,
      },
      select: {
        id: true,
      },
    });
    if (!cohort) {
      logger.error(`Cohort not found: ${cohort_id}`);
      return null;
    }

    let decision_date_obj;
    if (decision_date) {
      decision_date_obj = new Date(decision_date);
      if (Number.isNaN(decision_date_obj.getTime())) {
        logger.error(`Invalid decision date: ${decision_date}`);
        return null;
      }
    }

    if (rejection_reason) {
      notes += `\nRejection Reason: ${rejection_reason}\n`;
    }

    return {
      requester_id: requester.id,
      cohort_id,
      reviewer_id: reviewer?.id,
      decision_date: decision_date_obj,
      status,
      notes,
    };
  } catch (error) {
    logger.error(`Error transforming record: ${error.message}`);
    return null;
  }
}

async function updateCohortAccessRequest(updatedRecord) {
  try {
    // find the PENDING record for the requester_id, cohort_id
    // unique constraint on requester_id, cohort_id in the database
    const access_request = await prisma.cohort_access_request.findFirst({
      where: {
        status: 'PENDING',
        requester_id: updatedRecord.requester_id,
        cohort_id: updatedRecord.cohort_id,
      },
    });

    if (!access_request) {
      logger.error(
        // eslint-disable-next-line max-len
        `Cohort access request not found: requester_id=${updatedRecord.requester_id}, cohort_id=${updatedRecord.cohort_id}`,
      );
      return null;
    }

    return prisma.cohort_access_request.update({
      where: {
        id: access_request.id,
      },
      data: {
        status: updatedRecord.status,
        decision_date: updatedRecord.decision_date,
        notes: updatedRecord.rejection_reason,
        reviewer_id: updatedRecord.reviewer_id,
      },
    });
  } catch (error) {
    logger.error(`Error updating cohort access request: ${error.message}`);
    return null;
  }
}

async function handleRecords(records) {
  try {
    logger.info(`Processing ${records.length} records`);

    const results = await Promise.all(records.map(transformRecord));
    const transformedRecords = results.filter((record) => record != null);
    logger.info(`Step 1: ${transformedRecords.length}/${records.length} valid records`);

    // filter out PENDING records
    const fulfilledRecords = transformedRecords.filter((record) => record.status !== 'PENDING');
    logger.info(
      `Step 2: ${fulfilledRecords.length}/${transformedRecords.length} records that are not PENDING`,
    );

    // group records by requester_id, cohort_id
    // if multiple records exist for the same requester_id, cohort_id
    // the most recent record should be used
    const groupedRecords = _.flow(
      _.groupBy((record) => `${record.requester_id}-${record.cohort_id}`),
      _.mapValues(_.flow(_.sortBy('decision_date'), _.last)),
      _.values,
    )(fulfilledRecords);
    logger.info(
      `Step 3: ${groupedRecords.length}/${fulfilledRecords.length} records after grouping by requester_id, cohort_id\
to get the most recent record`,
    );

    const updatedRecords = await Promise.all(groupedRecords.map(updateCohortAccessRequest));
    const updatedRecordsCount = updatedRecords
      .filter((record) => record != null).length;
    logger.info(`Step 4: ${updatedRecordsCount}/${groupedRecords.length} cohort access requests updated`);
  } catch (error) {
    logger.error(`Error handling records: ${error.message}`);
  }
}

// get the created date of oldest record in pending status
async function getOldestPendingRequestDate() {
  const oldestRecord = await prisma.cohort_access_request.findFirst({
    where: {
      status: 'PENDING',
    },
    orderBy: {
      created_at: 'asc',
    },
    select: {
      created_at: true,
    },
  });

  return oldestRecord ? oldestRecord.created_at : null;
}

async function do_work() {
  const start_date = await getOldestPendingRequestDate();
  if (start_date === null) {
    logger.info('No pending records found');
    return;
  }
  const records = await redcap.getRecords({
    start_date,
  });
  await handleRecords(records);
}

const poll = async () => {
  try {
    await do_work();
    interval = INTERVAL_MS; // Reset interval on success
  } catch (error) {
    logger.error(`Error polling: ${error.message}`);
    interval = Math.min(interval * 2, MAX_BACKOFF_MS); // Increase interval with backoff up to a max
  } finally {
    setTimeout(poll, interval);
  }
};

// poll();

// redcap
//   .getRecords()
//   .then((res) => console.log(res))
//   .catch((err) => console.error(err.message, err.response.data));

module.exports = {
  poll,
  do_work,
  handleRecords,
  transformRecord,
  updateCohortAccessRequest,
  getOldestPendingRequestDate,
};
