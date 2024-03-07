const { Prisma } = require('@prisma/client');

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
      id = ${id}
  `;
}

function searchCohortsQuery({
  name = null, author_id = null, is_published = null, is_locked = null, is_protected = null,
} = {}) {
  const filters = [
    name ? Prisma.sql`name ILIKE ${`%${name}%`}` : null,
    author_id ? Prisma.sql`author_id = ${author_id}` : null,
    is_published ? Prisma.sql`is_published = ${is_published}` : null,
    is_locked ? Prisma.sql`is_locked = ${is_locked}` : null,
    is_protected ? Prisma.sql`is_protected = ${is_protected}` : null,
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

function searchAndSaveQuery(id, searchQuery) {
  const insertSql = Prisma.sql`
  INSERT INTO cohort (name, query, participants, author_id)
  SELECT
      'temp_cohort',
      '{}',
      ARRAY(${searchQuery}),
      1
  RETURNING id, array_length(participants, 1) AS size
  `;

  const upsertSql = Prisma.sql`
  INSERT INTO cohort (id, name, query, participants, author_id)
  SELECT
      ${id}
      'temp_cohort',
      '{}',
      ARRAY(${searchQuery}),
      1
  ON CONFLICT (id) DO UPDATE SET
      participants = EXCLUDED.participants,
      updated_at = CURRENT_TIMESTAMP
  RETURNING id, array_length(participants, 1) AS size
  `;
  return id != null ? upsertSql : insertSql;
}

module.exports = {
  getCohortByIdQuery,
  searchCohortsQuery,
  searchAndSaveQuery,
};
