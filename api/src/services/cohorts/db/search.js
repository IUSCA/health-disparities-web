const { Prisma } = require('@prisma/client');

const { getSearchableStates } = require('../authorization');
const { CV } = require('../authorization/constants');

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

  // archived filter
  if (filters.archived !== undefined) {
    where.AND.push({
      archived: filters.archived,
    });
  }

  // derivable filter
  if (filters.derivable !== undefined) {
    where.AND.push({
      derivable: filters.derivable,
    });
  }

  return where;
}

function createSearch({
  user, queryParams, filters = {}, include: callerInclude = {},
}) {
  return (prisma) => {
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

function createCount({
  user, filters = {},
}) {
  return (prisma) => {
    const where = buildWhereClause(user, filters);

    return prisma.cohort_view.count({
      where,
    });
  };
}

function getDependentCohortsQuery(id, requester_username) {
  // This is a recursive query that finds all dependent cohorts (both direct and indirect) of a given cohort
  // A cohort is dependent on another cohort if it is a combination cohort that includes the other cohort
  // Only cohorts of the requester that are private and not temporary are considered.
  // the given cohort is assued to be not temporary and private
  return Prisma.sql`
    with recursive dependent_cohorts as (
      select c.id
      from cohort c
      WHERE query->'schema'->>'name' = 'combination'
        AND query->'body'->'cohort_ids' @> to_jsonb(array[CAST(${id} AS UUID)])
        and is_temp = false
        and author_username = ${requester_username}
        and visibility = ${CV.PRIVATE}
      
      union
      
      select c.id
      from cohort c
      join dependent_cohorts dc on c.query->'body'->'cohort_ids' @> to_jsonb(array[dc.id])
      where 
        c.query->'schema'->>'name' = 'combination' 
        and c.is_temp = false
        and c.author_username = ${requester_username}
        and c.visibility = ${CV.PRIVATE}
    )
    select cv.*
    from dependent_cohorts dc
    join cohort_view cv on dc.id = cv.id
    order by cv.created_at desc
  `;
}

function createSearchDependents({ user, id }) {
  return (prisma) => {
    const sql = getDependentCohortsQuery(id, user.username);
    return prisma.$queryRaw(sql);
  };
}

module.exports = {
  createSearch,
  createCount,
  createSearchDependents,
};
