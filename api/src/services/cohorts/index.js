const { Prisma } = require('@prisma/client');
const config = require('config');
const { PHENOTYPE, GENOTYPE, COMBINATION } = require('./model');
const phenotypeService = require('./phenotype');
const combinationService = require('./combination');
const genotypeService = require('./genotype');

const cohort_select = Prisma.raw`
select
  c.id,
  c."name",
  c.query,
  c.created_at,
  c."description",
  c.metadata,
  c.updated_at,
  c.author_username,
  c.is_locked,
  c.is_protected,
  c.is_published,
  array_length(c.participants, 1) as "size", 
  u.id as author_id,
  u."name" as author_name, 
  u.email as author_email, 
  u.username as author_username`;

// To not return the participants array but the count of participants
// Why? Because the participants array can be very large and we don't need it
function getCohortByIdQuery(id) {
  return Prisma.sql`
    ${cohort_select}
    from
      cohort c
      join "user" u on c.author_username = u.username
    where
      c.id = CAST(${id} AS UUID)
  `;
}

/**
 * Generates a SQL query to search for cohorts based on the provided filters.
 * To not return the participants array but the count of participants
 * Why? Because the participants array can be very large and we don't need it

 *
 * @param {Object} options - The search options.
 * @param {string|null} options.name - The name of the cohort.
 * @param {string|null} options.author_username - The username of the author.
 * @param {boolean|null} options.is_published - Indicates if the cohort is published.
 * @param {boolean|null} options.is_locked - Indicates if the cohort is locked.
 * @param {boolean|null} options.is_protected - Indicates if the cohort is protected.
 * @param {boolean|null} options.is_temp - Indicates if the cohort is temporary.
 * @returns {} The prepared statement of SQL query for searching cohorts.
 */
function searchCohortsQuery({
  search_term = null,
  author_username = null,
  not_author_username = null,
  is_published = null,
  is_locked = null,
  is_protected = null,
  is_temp = null,
  type = null,
}, {
  sort_by = 'created_at',
  sort_order = 'DESC',
  limit = 100,
  offset = 0,
} = {}) {
  const filters = [
    search_term != null && search_term !== ''
      ? Prisma.sql`(c.name ILIKE ${`%${search_term}%`} or c.description ILIKE ${`%${search_term}%`})` : null,
    author_username != null ? Prisma.sql`c.author_username = ${author_username}` : null,
    not_author_username != null ? Prisma.sql`c.author_username != ${not_author_username}` : null,
    is_published != null ? Prisma.sql`c.is_published = ${is_published}` : null,
    is_locked != null ? Prisma.sql`c.is_locked = ${is_locked}` : null,
    is_protected != null ? Prisma.sql`c.is_protected = ${is_protected}` : null,
    is_temp != null ? Prisma.sql`c.is_temp = ${is_temp}` : null,
    type != null ? Prisma.sql`c.query->>'name' = ${type}` : null,
  ].filter((x) => x);

  const where = filters.length ? Prisma.join(filters, ' AND ') : Prisma.raw('1 = 1');

  // orderBy accepted values are created_at, updated_at, name, size;
  // this and orderDirection are validated in the middleware
  // if orderBy is name, created_at or updated_at, add c. to the column name
  // if orderBy is size, do not add c. to the column name
  const orderBy = sort_by === 'size' ? Prisma.raw(sort_by) : Prisma.raw(`c.${sort_by}`);
  const orderDirection = Prisma.raw(sort_order);
  return Prisma.sql`
    ${cohort_select}
    from
      cohort c
    join "user" u on c.author_username = u.username
    where
      ${where}
    order by ${orderBy} ${orderDirection} NULLS LAST
    limit ${limit}
    offset ${offset}
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
 *                     The SQL query returns the ID of the cohort and the count of participants.
 */
function saveSearchResultsQuery(id, searchQuery) {
  const TEMP_COHORT_NAME = 'temp_cohort';
  const AUTHOR_USERNAME = config.system_user.username; // "svc_tasks" non-user account
  const insertSql = Prisma.sql`
  INSERT INTO cohort (name, query, participants, is_temp, author_username)
  SELECT
      ${TEMP_COHORT_NAME},
      '{}',
      ARRAY(${searchQuery}),
      true,
      ${AUTHOR_USERNAME}
  RETURNING id, array_length(participants, 1) AS count
  `;

  const upsertSql = Prisma.sql`
  INSERT INTO cohort (id, name, query, participants, is_temp, author_username)
  SELECT
      ${id}::UUID,
      ${TEMP_COHORT_NAME},
      '{}',
      ARRAY(${searchQuery}),
      true,
      ${AUTHOR_USERNAME}
  ON CONFLICT (id) DO UPDATE SET
      participants = EXCLUDED.participants,
      updated_at = CURRENT_TIMESTAMP
  RETURNING id, array_length(participants, 1) AS count
  `;
  return id != null ? upsertSql : insertSql;
}

function searchParticipantsQuery(query, { count = false } = {}) {
  if (query.schema.name === PHENOTYPE) {
    return phenotypeService.buildParticipantsQuery(query.body, { count });
  } if (query.name === GENOTYPE) {
    return genotypeService.buildParticipantsQuery(query.body, { count });
  } if (query.name === COMBINATION) {
    return combinationService.buildParticipantsQuery(query.body, { count });
  }
  // won't reach here because of query validation
  throw new Error(`Invalid cohort query name: ${query.name}`);
}

module.exports = {
  getCohortByIdQuery,
  searchCohortsQuery,
  searchParticipantsQuery,
  saveSearchResultsQuery,
};
