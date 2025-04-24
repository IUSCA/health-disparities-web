const { Prisma, PrismaClient } = require('@prisma/client');
const _ = require('lodash/fp');
const config = require('config');
const ConflictError = require('./errors/ConflictError');
const StateMachine = require('./stateMachine');

const prisma = new PrismaClient();

const cohort_columns = {
  id: true,
  name: true,
  // description: true,
  // created_at: true,
  // updated_at: true,
  // query: true,
  // metadata: true,
  // is_published: true,
  // is_locked: true,
  // is_protected: true,
  // author_username: true,
};

const toAuditEntry = _.omit([
  'id', 'created_at', 'updated_at', 'stages', 'reviewer', 'cohort', 'requester', 'audit_logs',
]);
const toAuditStageEntry = _.pick(['status', 'decision_date', 'metadata']);
const CONFLICT_ERROR_MESSAGE = 'Conflict detected: access request was modified concurrently';

const fsmConfig = {
  states: ['INITIATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED'],
  transitions: [
    { from: 'INITIATED', to: 'PENDING', roles: ['redcap'] },
    { from: 'INITIATED', to: 'APPROVED', roles: ['redcap'] },
    { from: 'INITIATED', to: 'REJECTED', roles: ['redcap'] },
    { from: 'PENDING', to: 'APPROVED', roles: ['redcap'] },
    { from: 'PENDING', to: 'REJECTED', roles: ['redcap'] },
    { from: 'PENDING', to: 'CANCELED', roles: ['operator', 'admin', 'user'] },
    { from: 'PENDING', to: 'EXPIRED', roles: ['system'] },
    { from: 'APPROVED', to: 'EXPIRED', roles: ['operator', 'admin', 'system'] },
  ],
};

function getFSM(status) {
  const fsm = new StateMachine(fsmConfig);
  if (status) fsm.setState(status);
  return fsm;
}

function mapStages(stages) {
  return stages.map((stage) => ({
    id: stage.definition.id,
    name: stage.definition.name,
    description: stage.definition.description,
    status: stage.status,
    metadata: stage.metadata,
    decision_date: stage.decision_date,
    updated_at: stage.updated_at,
  }));
}

async function findAll({
  cohort_id, requester_id, requester_username, status, search, sort_by, sort_order, offset, limit,
} = {}) {
  const where = {};
  if (cohort_id) where.cohort_id = cohort_id;
  if (requester_id) where.requester_id = requester_id;
  if (requester_username) where.requester = { username: requester_username };
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { requester: { username: { contains: search, mode: 'insensitive' } } },
      { cohort: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  let orderBy = {
    [sort_by]: sort_order,
  };
  const nullable_order_by_fields = ['decision_date', 'expires_at', 'last_synced_at'];
  if (nullable_order_by_fields.includes(sort_by)) {
    orderBy = {
      [sort_by]: {
        sort: sort_order,
        nulls: 'last',
      },
    };
  }
  if (sort_by === 'requester') {
    orderBy = {
      requester: {
        username: sort_order,
      },
    };
  }
  if (sort_by === 'cohort') {
    orderBy = {
      cohort: {
        name: sort_order,
      },
    };
  }
  const [requests, total] = await prisma.$transaction([
    prisma.cohort_access_request.findMany({
      where,
      include: {
        requester: true,
        cohort: {
          select: cohort_columns,
        },
        reviewer: true,
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
      skip: offset,
      take: limit,
      orderBy,
    }),
    prisma.cohort_access_request.count({ where }),
  ]);

  return {
    requests: requests.map((request) => ({
      ...request,
      stages: mapStages(request.stages),
    })),
    total,
  };
}

async function findOne({
  id, cohort_id, requester_id, requester_username,
}, include = {}) {
  const where = {};
  if (id) where.id = id;
  if (cohort_id) where.cohort_id = cohort_id;
  if (requester_id) where.requester_id = requester_id;
  if (requester_username) where.requester = { username: requester_username };

  // need id
  // or cohort_id and requester_id
  // or cohort_id and requester_username
  if (!(
    where.id
    || (where.cohort_id && where.requester_id)
    || (where.cohort_id && where.requester?.username))
  ) {
    throw new Error('Must provide either id or cohort_id and requester_id or cohort_id and requester_username');
  }

  const request = await prisma.cohort_access_request.findFirstOrThrow({
    where,
    include: {
      requester: true,
      cohort: {
        select: cohort_columns,
      },
      reviewer: true,
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
      ...(include.audit_logs ? {
        audit_logs: {
          include: {
            changed_by: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      } : {}),
    },
  });
  request.stages = mapStages(request.stages);
  return request;
}
/**
 * Updates an access request and its associated stages, while auditing changes.
 *
 * @async
 * @function update
 * @param {Object} identifiers - Identifiers for the access request.
 * @param {number} identifiers.id - The ID of the access request.
 * @param {number} identifiers.requester_id - The ID of the requester.
 * @param {number} identifiers.cohort_id - The ID of the cohort.
 * @param {Object} updates - The fields to update in the access request.
 * @param {Date} [updates.decision_date] - The decision date of the access request.
 * @param {string} [updates.status] - The status of the access request.
 * @param {string} [updates.notes] - Notes associated with the access request.
 * @param {Date} [updates.expires_at] - The expiration date of the access request.
 * @param {Date} [updates.last_synced_at] - The last synchronization date of the access request.
 * @param {string} [updates.upstream_record_id] - The upstream record ID of the access request.
 * @param {Array<Object>} [updates.stages] - The stages to update, if any.
 * @param {Object} [context={}] - The context for the update operation.
 * @param {Object} [context.user] - The user performing the update.
 * @param {number} [context.user.id] - The ID of the user performing the update.
 * @param {string} [context.reason] - The reason for the update, used for auditing.
 * @param {number} [context.version] - The version of the access request for optimistic concurrency control.
 * @param {string} [context.source] - The source of the update, used for auditing.
 * @throws {Error} If the user context is missing or invalid.
 * @returns {Promise<Object>} The updated access request object.
 */
async function update(
  { id, requester_id, cohort_id },
  {
    decision_date, status, notes, expires_at, last_synced_at, upstream_record_id, stages,
  },
  context = {},
) {
  // Validate context user
  const userId = context.user?.id;
  if (!userId) {
    throw new Error('User context is required for auditing changes');
  }

  // requires context.version for optimistic concurrency control
  if (!context.version) {
    throw new Error('Version is required for optimistic concurrency control');
  }

  // Prepare incoming data
  const incoming = _.omitBy(_.isUndefined)({
    decision_date, status, notes, expires_at, last_synced_at, upstream_record_id,
  });

  const incoming_stages = stages || [];

  // TODO: if status changed, check transition rules from the state machine

  // fetch current data
  const request = await findOne({ id, requester_id, cohort_id });
  if (context.version === 0) {
    // if version is 0, we need to set it to the current version
    context.version = request.version;
  }

  // check if any of the incoming data is different from the original data
  const isDifferent = Object.entries(incoming)
    .some(([key, value]) => !_.isEqual(request[key], value));

  // filter out unchanged stages
  // only use auditable (which are updatable) fields for comparison
  const changed_stages = incoming_stages.filter((stage) => {
    const original_stage = request.stages.find((s) => s.id === stage.id);
    return !_.isEqual(
      toAuditStageEntry(original_stage),
      toAuditStageEntry(stage),
    );
  });

  // if nothing changed, return early
  if (!isDifferent && !changed_stages.length) {
    return request;
  }

  return prisma.$transaction(async (tx) => {
    // Update the main request if data has changed
    if (isDifferent) {
      let updatedRequest;
      try {
        updatedRequest = await tx.cohort_access_request.update({
          where: {
            id: request.id,
            version: context.version, // optimistic concurrency control
          },
          data: {
            ...incoming,
            version: { increment: 1 },
          },
        });
      } catch (e) {
        // only reason for row not found is if version is not correct (concurrently modified)
        // or if the row was deleted concurrently
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e?.meta?.cause?.includes('not found') || e?.code === 'P2025' || e?.code === 'P2015') {
            throw new ConflictError(CONFLICT_ERROR_MESSAGE);
          }
        }
        throw e;
      }

      // create audit log
      await tx.access_request_audit_log.create({
        data: {
          action: 'update',
          access_request_id: request.id,
          changed_by_id: userId,
          old_data: toAuditEntry(request),
          new_data: toAuditEntry(updatedRequest),
          reason: context.reason,
          change_source: context.source,
        },
      });
    }

    // Update stages if there are changes
    if (changed_stages.length > 0) {
      const updatedStages = await Promise.all(
        changed_stages.map((stage) => tx.access_request_stage.update({
          where: {
            definition_id: stage.id,
            access_request_id: request.id,
          },
          data: {
            status: stage.status,
            decision_date: stage.decision_date,
          },
        })),
      );

      // create audit logs for stage updates
      await tx.access_request_audit_log.createMany({
        data: updatedStages.map((updatedStage) => ({
          action: 'update',
          access_request_id: request.id,
          stage_id: updatedStage.id,
          changed_by_id: userId,
          old_data: toAuditStageEntry(request.stages.find((s) => s.id === updatedStage.id)),
          new_data: toAuditStageEntry(updatedStage),
          reason: context.reason,
          change_source: context.source,
        })),
      });
    }
    return findOne({ id: request.id });
  });
}

/**
 * Creates a new cohort access request with the provided details and initializes stages with a default status.
 *
 * @async
 * @function create
 * @param {Object} params - The parameters for creating the access request.
 * @param {string} params.requester_id - The ID of the requester.
 * @param {string} params.cohort_id - The ID of the cohort.
 * @param {string} params.reviewer_id - The ID of the reviewer.
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
  requester_id, cohort_id, reviewer_id, status, decision_date, expires_at, notes,
}, context = {}) {
  // Validate context user
  const userId = context.user?.id;
  if (!userId) {
    throw new Error('User context is required for auditing changes');
  }

  const data = _.omitBy(_.isUndefined)({
    requester_id, cohort_id, reviewer_id, status, decision_date, expires_at, notes,
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

module.exports = {
  findAll,
  findOne,
  update,
  create,
  getFSM,
  fsmConfig,
};
