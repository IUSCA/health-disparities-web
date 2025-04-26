const { PrismaClient } = require('@prisma/client');
const { mapStages } = require('./utils');

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
  id, cohort_id, requester_id, requester_username, request_id,
}, include = {}) {
  const where = {};
  if (id) where.id = id;
  if (cohort_id) where.cohort_id = cohort_id;
  if (requester_id) where.requester_id = requester_id;
  if (requester_username) where.requester = { username: requester_username };
  if (request_id) where.request_id = request_id;

  // need id
  // or cohort_id and requester_id
  // or cohort_id and requester_username
  if (!(
    where.id
    || where.request_id
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

module.exports = {
  findAll,
  findOne,
};
