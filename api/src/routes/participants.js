const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, query } = require('express-validator');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');
const visualization = require('../services/cohorts/visualization');

const isPermittedTo = accessControl('cohort');
const router = express.Router();

router.get(
  '/total-count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get total count of participants in the database.'
    const total = await prisma.participant.count();

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    return res.json({ total });
  }),
);

router.get(
  '/:participant_id',
  isPermittedTo('read'),
  validate([
    param('participant_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get details of a participant by id.'

    const participant = await prisma.participant.findUniqueOrThrow({
      where: {
        id: req.params.participant_id,
      },
      include: {
        demographics: true,
        labs: true,
        covid_tests: true,
        covid_vaxes: true,
        dxs: true,
        hospitals: true,
        medications: true,
      },
    });
    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(participant);
  }),
);

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('limit').default(10).isInt({ min: 1, max: 100 })
      .toInt(),
    query('offset').default(0).isInt({ min: 0 })
      .toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participants']
  // #swagger.summary = 'Get participants of a cohort.'
    const cohort = await prisma.cohort.findFirstOrThrow({
      where: {
        id: req.query.cohort_id,
      },
    });
    const participant_ids = cohort.participants.slice(
      req.query.offset,
      req.query.offset + req.query.limit,
    );
    const participants = await prisma.participant.findMany({
      where: {
        id: {
          in: participant_ids,
        },
      },
      include: {
        demographics: true,
      },
    });

    // remove ib_id, study_id and
    // change demographics from array on one object to a simple object
    const _participants = participants.map((participant) => {
      const {
        // eslint-disable-next-line no-unused-vars
        ib_id, study_id, demographics, ...rest
      } = participant;
      return {
        ...rest,
        demographics: demographics?.[0],
      };
    });
    res.json(_participants);
  }),
);

router.get(
  '/aggregate',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('field').isIn(['gender', 'race', 'ethnicity']),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get aggregate of a field for a cohort.'
    const { field, cohort_id } = req.query;

    const sql = visualization.aggregateFieldSQL(cohort_id, field);
    const _rows = await prisma.$queryRaw(sql);

    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = parseInt(item.count, 10);
      return acc;
    }, {});

    res.json(distinctValuesWithCounts);
  }),
);

router.get(
  '/bins',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('field').isIn(['age']),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res, next) => {
    // only works for age field
    const { bins, cohort_id } = req.query;
    const sql = visualization.ageHistogramSQL(cohort_id, bins);
    // console.log(sql.sql, sql.values);
    const _rows = await prisma.$queryRaw(sql);
    res.json(_rows);
  }),
);

router.get(
  '/bins/date',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('field').isIn(['max_enc_date', 'enroll_date', 'dob']),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res, next) => {
    // only works for age field
    const { field, bins, cohort_id } = req.query;
    const _rows = await visualization.dateHistogram(cohort_id, field, bins);
    res.json(_rows);
  }),
);

module.exports = router;
