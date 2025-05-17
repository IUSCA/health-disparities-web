const { getSearchableStates } = require('./authorization');

function buildWhereClause(user, filters) {
  const where = {
    AND: [
      {
        OR: [{
          author_username: user.username,
        }, {
          visibility: {
            in: getSearchableStates(user),
          },
        }],
      },
      {
        is_temp: false,
      },
    ],
  };

  // visibility filter
  if (filters.visibility) {
    where.AND.push({
      visibility: filters.visibility,
    });
  }

  // name, description filter
  if (filters.search_term) {
    where.AND.push({
      OR: [
        {
          name: {
            contains: filters.search_term,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: filters.search_term,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  // type filter
  if (filters.type) {
    where.AND.push({
      query: {
        path: ['schema', 'name'],
        equals: filters.type,
      },
    });
  }

  return where;
}

function createSearch({
  user, queryParams, filters = {}, include: callerInclude = {},
}) {
  return async (prisma) => {
    const where = buildWhereClause(user, filters);

    const defaultInclude = {
      author: true,
    };

    return prisma.cohort_view.findMany({
      where,
      include: {
        ...defaultInclude,
        ...callerInclude, // caller can override or extend includes
      },
      orderBy: {
        [queryParams.sort_by]: queryParams.sort_order,
      },
      take: queryParams.limit,
      skip: queryParams.offset,
    });
  };
}

module.exports = {
  createSearch,
};
