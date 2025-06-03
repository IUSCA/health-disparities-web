const { Prisma } = require('@prisma/client');

const { getSearchableStates } = require('../authorization');
const { CV } = require('../authorization/constants');

function buildWhereClause(user, filters) {
  const where = {
    AND: [{
      is_temp: false,
    }],
  };

  // created_by_me filter
  if (filters.created_by_me != null) {
    if (filters.created_by_me) {
      // if created_by_me is set, we filter by the user's username (and all visibilities)
      where.AND.push({
        author_username: user.username,
      });
    } else {
      // if created_by_me is false, we filter out the user's cohorts
      // and only show cohorts that are visible to the user
      where.AND.push({
        author_username: {
          not: user.username,
        },
        visibility: {
          in: getSearchableStates(user),
        },
      });
    }
  } else {
    // if created_by_me is not set, we assume the user wants to see all cohorts they can access
    where.AND.push({
      OR: [{
        author_username: user.username,
      }, {
        visibility: {
          in: getSearchableStates(user),
        },
      }],
    });
  }

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
  if (filters.archived != null) {
    where.AND.push({
      is_archived: filters.archived,
    });
  }

  // derivable filter
  if (filters.derivable != null) {
    where.AND.push({
      is_derivable: filters.derivable,
    });
  }

  return where;
}

function createSearch({
  user, queryParams, filters = {}, include: callerInclude = {},
}) {
  return (prisma) => {
    const where = buildWhereClause(user, filters);
    // console.log('Cohort search where clause:', filters, where);

    const defaultInclude = {
      author: true,
    };

    const opts = {
      where,
      include: {
        ...defaultInclude,
        ...callerInclude, // caller can override or extend includes
      },
      take: queryParams.limit ?? Prisma.skip,
      skip: queryParams.offset ?? Prisma.skip,
    };

    // apply sorting if specified
    if (queryParams.sort_by && queryParams.sort_order) {
      opts.orderBy = {
        [queryParams.sort_by]: queryParams.sort_order,
      };
    }

    return prisma.cohort_view.findMany(opts);
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
  // the given cohort is assumed to be not temporary and private
  return Prisma.sql`
    with recursive dependent_cohorts as (
      select c.id
      from cohort c
      WHERE query->'schema'->>'name' = 'combination'
        AND query->'body'->'cohort_ids' @> to_jsonb(array[CAST(${id} AS UUID)])
        and is_temp = false
        and author_username = ${requester_username}
        and visibility = CAST(${CV.PRIVATE} AS cohort_visibility) 
      
      union
      
      select c.id
      from cohort c
      join dependent_cohorts dc on c.query->'body'->'cohort_ids' @> to_jsonb(array[dc.id])
      where 
        c.query->'schema'->>'name' = 'combination' 
        and c.is_temp = false
        and c.author_username = ${requester_username}
        and c.visibility = CAST(${CV.PRIVATE} AS cohort_visibility) 
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
    // console.log('Executing SQL for dependent cohorts:', sql.text, sql.values);
    return prisma.$queryRaw(sql);
  };
}

module.exports = {
  createSearch,
  createCount,
  createSearchDependents,
};
