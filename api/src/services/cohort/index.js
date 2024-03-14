const { Prisma } = require('@prisma/client');
const { buildParticipantsQuery } = require('./participants');
const { combineQuery } = require('./combination');
const { PHENOTYPE_QUERY, GENOTYPE_QUERY, SET_OPERATIONS_QUERY } = require('./validation');

// TODO: join with user table and return author's data
const cohort_select = Prisma.raw`
select
  id,
  "name",
  query,
  created_at,
  "description",
  metadata,
  updated_at,
  author_id,
  is_locked,
  is_protected,
  is_published,
  array_length(participants, 1) as "size"
`;

// To not return the participants array but the count of participants
// Why? Because the participants array can be very large and we don't need it
function getCohortByIdQuery(id) {
  return Prisma.sql`
    ${cohort_select}
    from
      cohort
    where
      id = CAST(${id} AS UUID)
  `;
}

/**
 * Generates a SQL query to search for cohorts based on the provided filters.
 * To not return the participants array but the count of participants
 * Why? Because the participants array can be very large and we don't need it

 *
 * @param {Object} options - The search options.
 * @param {string|null} options.name - The name of the cohort.
 * @param {number|null} options.author_id - The ID of the author.
 * @param {boolean|null} options.is_published - Indicates if the cohort is published.
 * @param {boolean|null} options.is_locked - Indicates if the cohort is locked.
 * @param {boolean|null} options.is_protected - Indicates if the cohort is protected.
 * @param {boolean|null} options.is_temp - Indicates if the cohort is temporary.
 * @returns {} The prepared statement of SQL query for searching cohorts.
 */
function searchCohortsQuery({
  name = null,
  author_id = null,
  is_published = null,
  is_locked = null,
  is_protected = null,
  is_temp = null,
} = {}) {
  const filters = [
    name != null ? Prisma.sql`name ILIKE ${`%${name}%`}` : null,
    author_id != null ? Prisma.sql`author_id = ${author_id}` : null,
    is_published != null ? Prisma.sql`is_published = ${is_published}` : null,
    is_locked != null ? Prisma.sql`is_locked = ${is_locked}` : null,
    is_protected != null ? Prisma.sql`is_protected = ${is_protected}` : null,
    is_temp != null ? Prisma.sql`is_temp = ${is_temp}` : null,
  ].filter((x) => x);

  const where = filters.length ? Prisma.join(filters, ' AND ') : Prisma.raw('1 = 1');
  return Prisma.sql`
    ${cohort_select}
    from
      cohort
    where
      ${where}
  `;
}

/**
 * Saves the search results to the cohort table as a temporary cohort.
 * If id is null, it will create a new cohort.
 * If a cohort with id already exists, it will update the participants and the updated_at field.
 * If a cohort with id does not exist, it will insert a new cohort with this id.
 *
 * @param {number} id - The ID of the cohort.
 * @param {string} searchQuery - The search query.
 * @returns {string} - The SQL query to save the search results.
 */
function saveSearchResults(id, searchQuery) {
  const TEMP_COHORT_NAME = 'temp_cohort';
  const AUTHOR_ID = 1; // id of svc_tasks non-user account
  const insertSql = Prisma.sql`
  INSERT INTO cohort (name, query, participants, is_temp, author_id)
  SELECT
      ${TEMP_COHORT_NAME},
      '{}',
      ARRAY(${searchQuery}),
      true,
      ${AUTHOR_ID}
  RETURNING id, array_length(participants, 1) AS count
  `;

  const upsertSql = Prisma.sql`
  INSERT INTO cohort (id, name, query, participants, is_temp, author_id)
  SELECT
      ${id}::UUID,
      ${TEMP_COHORT_NAME},
      '{}',
      ARRAY(${searchQuery}),
      true,
      ${AUTHOR_ID}
  ON CONFLICT (id) DO UPDATE SET
      participants = EXCLUDED.participants,
      updated_at = CURRENT_TIMESTAMP
  RETURNING id, array_length(participants, 1) AS count
  `;
  return id != null ? upsertSql : insertSql;
}

function searchParticipants(query, { count = false } = {}) {
  if (query.name === PHENOTYPE_QUERY) {
    return buildParticipantsQuery(query.criteria, { count });
  } if (query.name === GENOTYPE_QUERY) {
    throw new Error('Not implemented');
  } else if (query.name === SET_OPERATIONS_QUERY) {
    return combineQuery(query.criteria, { count });
  } else {
    // won't reach here because of query validation
    throw new Error(`Invalid cohort query name: ${query.name}`);
  }
}

module.exports = {
  getCohortByIdQuery,
  searchCohortsQuery,
  saveSearchResults,
  searchParticipants,
};
