const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body, query } = require('express-validator');
const _ = require('lodash/fp');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');
const {
  validateCohortQuery, buildCohortQuery, sanitizeCohortQuery, CATEGORIES,
  searchCohortsQuery, getCohortByIdQuery, validateSetOperations, combineCohortQuery,
} = require('../services/cohort');

const isPermittedTo = accessControl('cohort');
const router = express.Router();

async function getCohortById(id) {
  const sqlQuery = getCohortByIdQuery(id);
  const cohorts = await prisma.$queryRaw(sqlQuery);
  return cohorts[0];
}

router.get(
  '/:category/:field/unique',
  isPermittedTo('read'),
  validate([
    param('category').isIn(CATEGORIES),
  ]),
  asyncHandler(async (req, res, next) => {
    const { category, field } = req.params;
    const _rows = await prisma[category].groupBy({
      by: [field],
      _count: {
        [field]: true,
      },
      orderBy: {
        _count: {
          [field]: 'desc',
        },
      },
    });
    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = item._count[field];
      return acc;
    }, {});

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    return res.json(distinctValuesWithCounts);
  }),
);

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('mine').optional().isBoolean(),
    query('is_published').optional().isBoolean(),
    query('is_locked').optional().isBoolean(),
    query('is_protected').optional().isBoolean(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Filter cohorts.'
    const data = _.pick(['name', 'is_published', 'is_locked', 'is_protected'])(req.query);
    if (data.mine) {
      data.author_id = req.user.id;
    }
    const sqlQuery = searchCohortsQuery(data);
    const cohorts = await prisma.$queryRaw(sqlQuery);
    res.json(cohorts);
  }),
);

router.get(
  '/participants/total',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    const total = await prisma.participant.count();

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    return res.json({ total });
  }),
);

router.post(
  '/search',
  validate([
    body('query').custom(validateCohortQuery).bail().customSanitizer(sanitizeCohortQuery),
  ]),
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    const sqlQuery = buildCohortQuery(req.body.query.query, {
      count: true,
    });
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
    const rows = await prisma.$queryRaw(sqlQuery);
    res.json({ count: Number(rows[0].count) });
  }),
);

router.post(
  '/search/set_operations',
  validate([
    body('set_operations').custom(validateSetOperations),
  ]),
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    const sqlQuery = combineCohortQuery({ ...req.body.set_operations, count: true });
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
    const rows = await prisma.$queryRaw(sqlQuery);
    res.json({ count: Number(rows[0].count) });
  }),
);

router.get(
  '/:id',
  isPermittedTo('read'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Get a cohort.'
    const cohort = await getCohortById(req.params.id);
    if (!cohort) {
      return res.sendStatus(404);
    }
    res.json(cohort);
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').isString().notEmpty(),
    body('query').custom(validateCohortQuery).bail().customSanitizer(sanitizeCohortQuery),
    body('is_published').optional().isBoolean(),
    body('is_locked').optional().isBoolean(),
    body('is_protected').optional().isBoolean(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Create cohort.'

    // cannot save a cohort with empty query {}

    const cohort_data = _.flow([
      _.pick(['name', 'query', 'is_published', 'is_locked', 'is_protected', 'description', 'metadata']),
      _.omitBy(_.isNil),
    ])(req.body);

    const sqlQuery = buildCohortQuery(req.body.query.query);
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
    const rows = await prisma.$queryRaw(sqlQuery);
    // rows is like [{participant_id: 1}, {participant_id: 2}, ...]
    const participants_ids = rows.map((row) => row.participant_id);

    const createdCohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        author_id: req.user.id,
        participants: participants_ids,
      },
      select: {
        id: true,
      },
    });

    const cohort = await getCohortById(createdCohort.id);
    return res.json(cohort);
  }),
);

router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isInt().toInt(),
    body('name').optional().isString().notEmpty(),
    body('query').optional()
      .custom(validateCohortQuery).bail()
      .customSanitizer(sanitizeCohortQuery),
    body('is_published').optional().isBoolean(),
    body('is_locked').optional().isBoolean(),
    body('is_protected').optional().isBoolean(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Modify cohort.'
    // TODO: user role can modify cohort if they are the author,
    // operator role can modify any cohort

    const { id } = req.params;

    const cohort_data = _.pick(
      ['name', 'query', 'is_published', 'is_locked', 'is_protected', 'description', 'metadata'],
    )(req.body);

    if (cohort_data.metadata) {
      const cohortToUpdate = await prisma.cohort.findFirstOrThrow({
        where: {
          id,
        },
      });
      cohort_data.metadata = _.merge(cohortToUpdate?.metadata)(cohort_data.metadata); // deep merge
    }

    if (cohort_data.query) {
      const sqlQuery = buildCohortQuery(cohort_data.query.query);
      // eslint-disable-next-line no-console
      console.log(sqlQuery.sql, sqlQuery.values);
      const rows = await prisma.$queryRaw(sqlQuery);
      // rows is like [{participant_id: 1}, {participant_id: 2}, ...]
      const participants_ids = rows.map((row) => row.participant_id);
      cohort_data.participants = participants_ids;
    }

    await prisma.cohort.update({
      where: {
        id,
      },
      data: cohort_data,
      select: {
        id: true,
      },
    });

    const cohort = await getCohortById(id);
    return res.json(cohort);
  }),
);

router.post(
  '/:id/export',
  isPermittedTo('read'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // const { id } = req.params;
    // const cohort = await prisma.cohort.findUniqueOrThrow({
    //   where: {
    //     id,
    //   },
    //   include: {
    //     participants: true,
    //   },
    // });
    // const filename = `cohort-${cohort.name}-${new Date().toISOString()}.json`;
    // res.attachment(filename);
    res.json({});
  }),
);

module.exports = router;
