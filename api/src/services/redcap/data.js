const config = require('config');
const { PrismaClient } = require('@prisma/client');
const _ = require('lodash/fp');
const validator = require('validator');

const accessRequestsService = require('../access_requests');
const userService = require('../user');
const {
  parseDate, parseStatus, parseSTEStatus, getLastModifiedDate,
} = require('./utils');

const prisma = new PrismaClient();
const { fsm } = accessRequestsService;

// get the created date of oldest record in pending status
async function getOldestPendingRequestDate() {
  const oldestRecord = await prisma.cohort_access_request.findFirst({
    where: {
      status: {
        in: ['PENDING', 'INITIATED'],
      },
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

/**
 * Transforms a REDCap record into a structured format for further processing.
 *
 * @async
 * @function transformRecord
 * @param {Object} record - The REDCap record to transform.
 * @returns {Promise<[string|null, Object|null]>} A tuple where the first element is an error message (if any),
 * or null if successful, and the second element is the transformed record object or null if an error occurred.
 *
 * Does not throw an error.
 */
async function transformRecord(record) {
  try {
    const requester_email = record[config.get('redcap.form_keys.requester_email')];

    const cohort_id = record[config.get('redcap.form_keys.cohort_id')];

    const request_id = record[config.get('redcap.form_keys.request_id')] || '';

    const decision_date = parseDate(record[config.get('redcap.form_keys.decision_date')]);
    const status = parseStatus(record[config.get('redcap.form_keys.decision')]);

    const ste_decision = parseSTEStatus(record[config.get('redcap.form_keys.ste_decision')]);
    const ste_decision_date = parseDate(record[config.get('redcap.form_keys.ste_decision_date')]);
    const ssc_decision = parseStatus(record[config.get('redcap.form_keys.ssc_decision')]);
    const ssc_decision_date = parseDate(record[config.get('redcap.form_keys.ssc_decision_date')]);
    const daa_decision = parseStatus(record[config.get('redcap.form_keys.daa_decision')]);
    const daa_decision_date = parseDate(record[config.get('redcap.form_keys.daa_decision_date')]);

    if (!validator.isUUID(request_id)) {
      return [`request_id: ${request_id} is not in the UUID format`, null];
    }
    const _req = await prisma.cohort_access_request.findFirst({
      where: {
        request_id,
      },
      select: {
        id: true,
      },
    });
    if (!_req) {
      return [`request_id : ${request_id} is not found in the database`, null];
    }

    let requester;
    if (requester_email) {
      requester = await prisma.user.findUnique({
        where: {
          email: requester_email,
          is_deleted: false,
        },
      });
    }
    if (!requester) {
      return [`Requester not found: ${requester_email}`, null];
    }

    let cohort;
    if (cohort_id) {
      cohort = await prisma.cohort.findFirst({
        where: {
          id: cohort_id,
        },
        select: {
          id: true,
        },
      });
    }
    if (!cohort) {
      return [`Cohort not found: ${cohort_id}`, null];
    }

    // if (rejection_reason) {
    //   notes += `\nRejection Reason: ${rejection_reason}\n`;
    // }

    return [null, {
      record_id: record.record_id,
      requester_id: requester.id,
      cohort_id,
      decision_date,
      status,
      request_id,
      stages: [
        {
          id: config.get('redcap.stages.ste'),
          status: ste_decision,
          decision_date: ste_decision_date,
        },
        {
          id: config.get('redcap.stages.ssc'),
          status: ssc_decision,
          decision_date: ssc_decision_date,
        },
        {
          id: config.get('redcap.stages.daa'),
          status: daa_decision,
          decision_date: daa_decision_date,
        },
        {
          id: config.get('redcap.stages.final_review'),
          status,
          decision_date,
        },
      ],
      last_updated_at: getLastModifiedDate(record),
    }];
  } catch (error) {
    return [`Error transforming record: ${error.message}`, null];
  }
}

async function updateCohortAccessRequest(upstreamRecord) {
  try {
    // find the INITIATED / PENDING record
    const request = await prisma.cohort_access_request.findFirst({
      where: {
        status: {
          in: ['INITIATED', 'PENDING'],
        },
        requester_id: upstreamRecord.requester_id,
        cohort_id: upstreamRecord.cohort_id,
        request_id: upstreamRecord.request_id,
      },
      include: {
        stages: {
          include: {
            definition: true,
          },
          orderBy: {
            definition: {
              order: 'asc',
            },
          },
        },
      },
    });

    if (!request) {
      return [
        `Cohort access request not found: requester_id=${upstreamRecord.requester_id}, \
cohort_id=${upstreamRecord.cohort_id} and request_id=${upstreamRecord.request_id}`, null];
    }
    request.stages = accessRequestsService.mapStages(request.stages);

    // do not update when status did not change
    // or any of the statuses in stages did not change
    if (request.status === upstreamRecord.status) {
      const statusMapper = (stages) => stages.reduce((acc, stage) => {
        acc[stage.id] = stage.status;
        return acc;
      }, {});
      const upstreamStatus = statusMapper(upstreamRecord.stages);
      const requestStatus = statusMapper(request.stages);
      if (_.isEqual(upstreamStatus, requestStatus)) {
        // 'No status changes detected - update skipped'
        return [null, null];
      }
    }

    // check if the status transition is valid only when main status is changed
    if (request.status !== upstreamRecord.status) {
      const canTransition = fsm.getFSM(request.status)
        .canTransition({ to: upstreamRecord.status, role: fsm.Roles.REDCAP });
      if (!canTransition) {
        return [`Invalid status transition: ${request.status} -> ${upstreamRecord.status}`, null];
      }
    }
    // else: both statuses should be PENDING
    // redcap does not have INITIATED status
    // and we are fetching only INITIATED and PENDING records

    // when the status is APPROVED, set the expires_at date
    // to the current date + config.get('access_requests.exipration.days') days
    let expires_at;
    if (upstreamRecord.status === 'APPROVED' && config.get('access_requests.exipration.enabled')) {
      expires_at = new Date(
        new Date().getTime() + (config.get('access_requests.exipration.days') * 24 * 60 * 60 * 1000),
      );
    }

    const systemUser = await userService.getSystemUser();
    const result = await accessRequestsService.update({
      identifiers: {
        id: request.id,
      },
      updates: {
        status: upstreamRecord.status,
        decision_date: upstreamRecord.decision_date,
        last_synced_at: new Date(),
        upstream_record_id: upstreamRecord.record_id,
        expires_at,
        stages: upstreamRecord.stages,
      },
      context: {
        user: systemUser,
        reason: 'REDCap sync',
        version: request.version,
        source: fsm.Roles.REDCAP,
      },
    });
    return [null, result];
  } catch (error) {
    return [`Error updating cohort access request: ${error.message}`, null];
  }
}

module.exports = {
  getOldestPendingRequestDate,
  transformRecord,
  updateCohortAccessRequest,
};
