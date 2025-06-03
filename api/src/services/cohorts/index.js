const assert = require('assert');
const { Prisma } = require('@prisma/client');
const config = require('config');
const { PHENOTYPE, GENOTYPE, COMBINATION } = require('./model');
const phenotypeService = require('./phenotype');
const combinationService = require('./combination');
const genotypeService = require('./genotype');

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
  searchParticipantsQueryAsync,
  saveSearchResultsQuery,
  getCohortFilesQuery,
  getFileInfoQuery,
  getCohortFilesSummaryQuery,
};
