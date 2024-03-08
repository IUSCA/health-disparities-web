const { Prisma } = require('@prisma/client');
const { cohortParticipantsQuery } = require('./combination');

function getDataQuery(category, cohort_id) {
  return Prisma.sql`
    select *
    from ${Prisma.raw(category)}
    where participant_id in (
      ${cohortParticipantsQuery(cohort_id)}
    )
  `;
}

module.exports = {
  getDataQuery,
};
