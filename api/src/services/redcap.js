const axios = require('axios');
const config = require('config');
const { PrismaClient } = require('@prisma/client');
const _ = require('lodash/fp');
const validator = require('validator');

const accessRequestsService = require('./access_requests');
const userService = require('./user');

const prisma = new PrismaClient();

const client = axios.create({
  baseURL: config.get('redcap.base_url'),
});
const API_TOKEN = config.get('redcap.api_token');

function buildRedcapFilterLogic(filters) {
  const _filters = _.omitBy(_.isUndefined, filters);
  if (_.isEmpty(_filters)) {
    return '';
  }
  const conditions = Object.entries(_filters).map(([key, value]) => `[${key}]="${value}"`);
  return conditions.join(' && ');
}

/**
 * Get records from REDCap
 * @param {Object} options
 * @param {Array} options.select - Fields to select
 * @param {Date} options.start_date - Return only records that have been created or modified *after* a given date/time in Redcap server timezone
 * @param {Date} options.end_date - Return only records that have been created or modified *before* a given date/time in Redcap server timezone
 * @returns {Promise} - A promise that resolves with the records
 */
function getRecords({
  filters = {},
  select = [],
  start_date = null,
  end_date = null,
} = {}) {
  const data = {
    token: API_TOKEN,
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'flat',
    csvDelimiter: '',
    rawOrLabel: 'raw',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'true',
    exportSurveyFields: 'true',
    exportDataAccessGroups: 'true',
    returnFormat: 'json',
    filterLogic: buildRedcapFilterLogic(filters),
  };

  if (select.length) {
    // 'approve_catalog_access_complete, catalog_access_status,
    // catalog_access_revoked, terra_user_id, who_apprv_catalog_access, who_revoked_catalog_access,
    // why_catalog_access_revoked'
    data.fields = select.join(',');
  }

  if (start_date) {
    // convert to YYYY-MM-DD HH:MM:SS
    // eslint-disable-next-line prefer-destructuring
    data.dateRangeBegin = start_date.toISOString().split('T')[0];
  }

  if (end_date) {
    // convert to YYYY-MM-DD HH:MM:SS
    // eslint-disable-next-line prefer-destructuring
    data.dateRangeEnd = end_date.toISOString().split('T')[0];
  }

  const params = new URLSearchParams();
  Object.keys(data).forEach((key) => {
    params.append(key, data[key]);
  });
  // console.log(params.toString());
  return client.post('/', params).then((response) => response.data);
}

function parseDate(dateString) {
  if (!dateString) {
    return;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return;
  }
  return date;
}

function parseStatus(status) {
  if (status === '1') {
    return 'APPROVED';
  } if (status === '0') {
    return 'REJECTED';
  }
  return 'PENDING';
}

function parseSTEStatus(status) {
  if (status === '1') {
    return 'APPROVED';
  } if (status === '0') {
    return 'REJECTED';
  } if (status === '2') {
    return 'APPROVED_WITH_REVISIONS';
  }
  return 'PENDING';
}

const getLastModifiedDate = _.flow([
  _.pickBy((value, key) => key.endsWith('_timestamp')),
  _.values,
  _.map((value) => new Date(value)),
  _.filter((date) => !Number.isNaN(date.getTime())),
  _.max,
]);

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

    // const reviewer_email = record[config.get('redcap.form_keys.approver_email')]
    // || record[config.get('redcap.form_keys.revoker_email')];
    // const rejection_reason = record[config.get('redcap.form_keys.rejection_reason')];

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

    // const reviewer = await prisma.user.findUnique({
    //   where: {
    //     email: reviewer_email,
    //     is_deleted: false,
    //   },
    // });
    // if (!reviewer) {
    //   logger.error(`Reviewer not found: ${reviewer_email}`);
    //   notes += `\nReviewer: ${reviewer_email}\n`;
    // }

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
      // reviewer_id: reviewer?.id,
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
        return ['No status changes detected - update skipped', null];
      }
    }

    // check if the status transition is valid only when main status is changed
    if (request.status !== upstreamRecord.status) {
      const fsm = accessRequestsService.getFSM(request.status);
      if (!fsm.canTransition({ to: upstreamRecord.status, role: 'redcap' })) {
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
      id: request.id,
    }, {
      status: upstreamRecord.status,
      decision_date: upstreamRecord.decision_date,
      last_synced_at: new Date(),
      upstream_record_id: upstreamRecord.record_id,
      expires_at,
      // reviewer_id: upstreamRecord.reviewer_id,
      stages: upstreamRecord.stages,
    }, {
      user: systemUser, reason: 'REDCap sync', version: request.version, source: 'redcap',
    });
    return [null, result];
  } catch (error) {
    return [`Error updating cohort access request: ${error.message}`, null];
  }
}

module.exports = {
  getRecords,
  getOldestPendingRequestDate,
  transformRecord,
  updateCohortAccessRequest,
};
