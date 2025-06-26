/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { Prisma } = require('@prisma/client');
const { param } = require('express-validator');
const _ = require('lodash/fp');
const createError = require('http-errors');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');
const { canPerformAction } = require('@/services/cohorts/authorization');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

router.get(
  '/:cohort_id/summary',
  isPermittedTo('read'),
  validate([
    param('cohort_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'cohortSummary'
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Get cohort summary'
    // #swagger.description = 'Returns a summary of the specified cohort'

    const { cohort_id } = req.params;

    // const cohort = await prisma.cohort_view.findUniqueOrThrow({
    //   where: {
    //     id: cohort_id,
    //   },
    //   include: {
    //     author: true,
    //   },
    // });

    // // access control
    // if (!canPerformAction('view', cohort, req.user)) {
    //   return next(createError(403));
    // }

    const cohortSummary = await prisma.$queryRaw`
      with cohort_participants as materialized (
        select
          unnest(c.participants) as id
        from
          cohort c
        where 
          c.id = CAST(${cohort_id} AS UUID)
      ),
      encounter_counts as (
        SELECT
          e.participant_id,
          count(*) AS count
        from
          encounter e
          join cohort_participants cp on e.participant_id = cp.id
        WHERE
          e."type" IN ('Emergency', 'Inpatient', 'Outpatient')
        GROUP BY
          e.participant_id
      )
      SELECT
        d.race_ethnicity,
        count(*) AS total_count,
        avg(age) AS mean_age,
        avg(
          CASE
            WHEN d.gender = 'Female' THEN 1
            ELSE 0
          END
        ) AS female_percentage,
        avg(ec.count) AS mean_encounters
      from
        demographic d
        join encounter_counts ec on ec.participant_id = d.participant_id
      GROUP BY
        d.race_ethnicity;
    `;

    res.json(cohortSummary.map((row) => ({
      race_ethnicity: row.race_ethnicity,
      total_count: parseInt(row.total_count, 10),
      mean_age: parseFloat(row.mean_age),
      female_percentage: parseFloat(row.female_percentage),
      mean_encounters: parseFloat(row.mean_encounters),
    })));
  }),
);

function get_counts_by_race_ethnicity_sql(cohort_id) {
  return Prisma.sql`
    WITH cohort_participants AS (
  SELECT unnest(c.participants) AS id
  FROM cohort c
  WHERE c.id = CAST(${cohort_id} AS UUID)
),
encounter_counts AS (
  SELECT
    e.participant_id,
    SUM(CASE WHEN e.TYPE = 'Emergency' THEN 1 ELSE 0 END) AS emergency,
    SUM(CASE WHEN e.TYPE = 'Inpatient' THEN 1 ELSE 0 END) AS inpatient,
    SUM(CASE WHEN e.TYPE = 'Outpatient' THEN 1 ELSE 0 END) AS outpatient
  FROM
    encounter e
    JOIN cohort_participants cp ON e.participant_id = cp.id
  GROUP BY
    e.participant_id
),
combined AS (
  SELECT
    d.race_ethnicity,
    ec.emergency,
    ec.inpatient,
    ec.outpatient
  FROM
    demographic d
    JOIN encounter_counts ec ON ec.participant_id = d.participant_id
  WHERE
    d.race_ethnicity IN ('Black', 'Hispanic', 'White')
),
stacked AS (
  SELECT race_ethnicity, 'emergency' AS type, emergency AS num_encounters FROM combined
  UNION ALL
  SELECT race_ethnicity, 'inpatient', inpatient FROM combined
  UNION ALL
  SELECT race_ethnicity, 'outpatient', outpatient FROM combined
),
ranked AS (
  SELECT
    race_ethnicity,
    type,
    num_encounters,
    NTILE(100) OVER (PARTITION BY race_ethnicity, type ORDER BY num_encounters) AS percentile
  FROM stacked
)
SELECT
  race_ethnicity,
  type,
  percentile - 1 AS percentile,  -- 0-indexed percentiles (0 to 99)
  MIN(num_encounters) AS num_encounters
FROM ranked
GROUP BY race_ethnicity, type, percentile
ORDER BY race_ethnicity, type, percentile`;
}

router.get(
  '/:cohort_id/encounter_percentiles',
  isPermittedTo('read'),
  validate([
    param('cohort_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'cohortEncounterPercentiles'
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Get cohort encounter percentiles'
    // #swagger.description = 'Returns encounter percentiles for the specified cohort'

    const { cohort_id } = req.params;

    // const cohort = await prisma.cohort_view.findUniqueOrThrow({
    //   where: {
    //     id: cohort_id,
    //   },
    //   include: {
    //     author: true,
    //   },
    // });

    // // access control
    // if (!canPerformAction('view', cohort, req.user)) {
    //   return next(createError(403));
    // }

    const sql = get_counts_by_race_ethnicity_sql(cohort_id);
    console.log(sql.sql, sql.values);
    const rows = await prisma.$queryRaw(sql);

    // rows is like [{race_ethnicity: '', type: '', percentile: 0, num_encounters: '0'}, ...]
    // cast num_encounters to integer
    // convert to {emergency: {Black: {percentiles: [], num_encounters: []}, Hispanic: {...}, ...}, inpatient: {...}, outpatient: {...}}

    const result = {};
    Object.entries(_.groupBy('type', rows))
      .forEach(([type, typeRows]) => {
        result[type] = {};
        Object.entries(_.groupBy('race_ethnicity', typeRows))
          .forEach(([raceEthnicity, raceRows]) => {
            result[type][raceEthnicity] = {
              percentiles: raceRows.map((row) => parseInt(row.percentile, 10)),
              num_encounters: raceRows.map((row) => parseInt(row.num_encounters, 10)),
            };
          });
      });

    res.json(result);
  }),
);

// router.get(
//   '/:cohort_id/encounter_bins',
//   isPermittedTo('read'),
//   validate([
//     query('cohort_id').isUUID(),
//   ]),
//   asyncHandler(async (req, res, next) => {
//     // #swagger.operationId = 'cohortEncounterBins'
//     // #swagger.tags = ['cohorts']
//     // #swagger.summary = 'Get cohort encounter bins'
//     // #swagger.description = 'Returns encounter bins for the specified cohort'

//     const { cohort_id } = req.params;

//     const cohort = await prisma.cohort_view.findUniqueOrThrow({
//       where: {
//         id: cohort_id,
//       },
//       include: {
//         author: true,
//       },
//     });

//     // access control
//     if (!canPerformAction('view', cohort, req.user)) {
//       return next(createError(403));
//     }
//   }),
// );

module.exports = router;
