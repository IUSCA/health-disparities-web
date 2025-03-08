const assert = require('assert');
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
function getCohortByIdQuery(id, username) {
  return Prisma.sql`
    ${cohort_select}
    from
      cohort c
      join "user" u on c.author_username = u.username
    where
      c.id = CAST(${id} AS UUID)
      and (c.author_username = ${username} or c.is_published = true)
  `;
}

/**
 * Generates a SQL query to search for cohorts based on the provided filters.
 * To not return the participants array but the count of participants
 * Why? Because the participants array can be very large and we don't need it

 *
 * @param {Object} options - The search options.
 * @param {string|null} options.search_term - The search term to filter by name or description.
 * @param {string|null} options.author_username - The username of the author.
 * @param {boolean|null} options.is_published - Indicates if the cohort is published.
 * @param {boolean|null} options.is_locked - Indicates if the cohort is locked.
 * @param {boolean|null} options.is_protected - Indicates if the cohort is protected.
 * @param {boolean|null} options.is_temp - Indicates if the cohort is temporary.
 * @returns {} The prepared statement of SQL query for searching cohorts.
 */
function searchCohortsQuery(requester_username, {
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
      (c.author_username = ${requester_username} or c.is_published = true) and
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

async function searchParticipantsQueryAsync(query, { count = false } = {}) {
  if (query.schema.name === PHENOTYPE) {
    return phenotypeService.buildParticipantsQuery(query.body, { count });
  } if (query.schema.name === GENOTYPE) {
    return genotypeService.buildParticipantsQueryAsync(query.body, { count });
  } if (query.schema.name === COMBINATION) {
    return combinationService.buildParticipantsQuery(query.body, { count });
  }
  // won't reach here because of query validation
  throw new Error(`Invalid cohort query name: ${query.name}`);
}

function getDependentCohortsQuery(id, requester_username) {
  // This is a recursive query that finds all dependent cohorts (both direct and indirect) of a given cohort
  // A cohort is dependent on another cohort if it is a combination cohort that includes the other cohort
  // Only cohorts of the requester that are not published and not temporary are considered.
  // the given cohort is assued to be not temporary and not published
  return Prisma.sql`
    with recursive dependent_cohorts as (
      select c.id
      from cohort c
      WHERE query->'schema'->>'name' = 'combination'
        AND query->'body'->'cohort_ids' @> to_jsonb(array[CAST(${id} AS UUID)])
        and is_temp = false
        and author_username = ${requester_username}
        and is_published = false
      
      union
      
      select c.id
      from cohort c
      join dependent_cohorts dc on c.query->'body'->'cohort_ids' @> to_jsonb(array[dc.id])
      where 
        c.query->'schema'->>'name' = 'combination' 
        and c.is_temp = false
        and c.author_username = ${requester_username}
        and c.is_published = false
    )
    ${cohort_select}
    from dependent_cohorts dc
    join cohort c on dc.id = c.id
    join "user" u on c.author_username = u.username
  `;
}

function getCohortFilesQuery({
  id, sort_by, sort_order, limit, offset,
}) {
  assert(['id', 'name', 'size'].includes(sort_by), 'sort_by must be one of: id, name, size');
  const sort_by_col = Prisma.raw(sort_by);
  return Prisma.sql`
    WITH cohort_participants AS (
      SELECT unnest(participants) AS pid 
      FROM cohort
      WHERE id = CAST(${id} AS UUID)
    ),
    results as (
      SELECT
        df.id,
        df.name,
        df.md5,
        df.size,
        p.ib_id as participant_id
      FROM dataset_file df
      JOIN dataset d ON df.dataset_id = d.id
      JOIN participant p ON p.id = d.participant_id
      WHERE df.filetype = 'file'
        AND p.id IN (SELECT pid FROM cohort_participants)
        AND d.is_deleted = false
    )
    SELECT
      *,
      COUNT(*) OVER () AS total_count
    FROM results
    ORDER BY ${sort_by_col} ${Prisma.raw(sort_order)} NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

function getFileInfoQuery({ user_id, file_id }) {
  return Prisma.sql`
    WITH approved_participants AS (
      SELECT DISTINCT unnest(c.participants) AS pid
      FROM cohort c
      JOIN cohort_access_request car ON car.cohort_id = c.id 
      WHERE car.status = 'APPROVED'
      AND car.requester_id = ${user_id}
    )
    SELECT df.*
    FROM dataset d
    JOIN dataset_file df ON df.dataset_id = d.id
    JOIN participant p ON d.participant_id = p.id
    JOIN approved_participants ap ON p.id = ap.pid
    WHERE df.id = ${file_id};
  `;
}

function getCohortFilesSummaryQuery({ id }) {
  return Prisma.sql`
    WITH cohort_participants AS (
      SELECT unnest(participants) AS pid 
      FROM cohort 
      WHERE id = CAST(${id} AS UUID)
    )
    SELECT 
        df.metadata->>'class' AS file_type, 
        COUNT(*) as file_count,
        sum(df.size) as total_size
    FROM participant p
    INNER JOIN cohort_participants cp ON cp.pid = p.id
    INNER JOIN dataset d ON d.participant_id = p.id
    INNER JOIN dataset_file df ON df.dataset_id = d.id
    WHERE df.filetype = 'file' 
      and d.is_deleted = false 
      and d.archive_path is not null 
      and df.metadata->>'class' is not null
    GROUP BY file_type
    order by file_count desc
  `;
}

module.exports = {
  getCohortByIdQuery,
  searchCohortsQuery,
  searchParticipantsQueryAsync,
  saveSearchResultsQuery,
  getDependentCohortsQuery,
  getCohortFilesQuery,
  getFileInfoQuery,
  getCohortFilesSummaryQuery,
};
