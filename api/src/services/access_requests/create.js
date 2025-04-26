const { PrismaClient } = require('@prisma/client');
const _ = require('lodash/fp');
const config = require('config');

const { toAuditEntry } = require('./utils');

const prisma = new PrismaClient();

/**
 * Creates a new cohort access request with the provided details and initializes stages with a default status.
 *
 * @async
 * @function create
 * @param {Object} params - The parameters for creating the access request.
 * @param {string} params.requester_id - The ID of the requester.
 * @param {string} params.cohort_id - The ID of the cohort.
 * @param {string} params.status - The status of the access request.
 * @param {Date} params.decision_date - The decision date of the access request.
 * @param {Date} params.expires_at - The expiration date of the access request.
 * @param {string} params.notes - Notes associated with the access request.
 * @param {Object} [context={}] - The context for the update operation.
 * @param {Object} [context.user] - The user performing the update.
 * @param {number} [context.user.id] - The ID of the user performing the update.
 * @param {string} [context.reason] - The reason for the update, used for auditing.
 * @param {string} [context.source] - The source of the update, used for auditing.
 * @throws {Error} If the user context is missing or invalid.
 * @returns {Promise<Object>} The created cohort access request record.
 */
async function create({
  requester_id, cohort_id, status, decision_date, expires_at, notes,
}, context = {}) {
  // Validate context user
  const userId = context.user?.id;
  if (!userId) {
    throw new Error('User context is required for auditing changes');
  }

  const data = _.omitBy(_.isUndefined)({
    requester_id, cohort_id, status, decision_date, expires_at, notes,
  });
  const { user } = context;

  const stage_ids = Object.values(config.get('redcap.stages'));

  return prisma.$transaction(async (tx) => {
    const request = await tx.cohort_access_request.create({
      data: {
        ...data,
        stages: {
          createMany: {
            data: stage_ids.map((id) => ({
              definition_id: id,
            })),
          },
        },
      },
    });

    // create audit log
    await tx.access_request_audit_log.create({
      data: {
        action: 'create',
        access_request_id: request.id,
        changed_by_id: user.id,
        new_data: toAuditEntry(request),
        reason: context.reason,
        change_source: context.source,
      },
    });

    return request;
  });
}

module.exports = { create };
