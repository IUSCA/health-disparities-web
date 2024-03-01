const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body } = require('express-validator');
const _ = require('lodash/fp');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');
const { validateCohortQuery, buildCohortQuery, sanitizeCohortQuery } = require('../services/cohort');

const isPermittedTo = accessControl('cohort');
const router = express.Router();
const CATEGORIES = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];
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
  asyncHandler(async (req, res, next) => {
    const where = {};
    if (req.query.name) {
      where.name = {
        contains: req.query.name,
        mode: 'insensitive', // case-insensitive search
      };
    }
    if (req.query.mine) {
      where.users = {
        some: {
          id: req.user.id,
        },
      };
    }
    // {
    //   include: {
    //     user: true,
    //   },
    // },
    const cohorts = await prisma.cohort.findMany({
      where,
      include: {
        users: true,
        participants: true,
      },
    });
    return res.json(cohorts.map((cohort) => {
      const { participants, ...rest } = cohort;
      return {
        ...rest,
        participants: participants.length,
      };
    }));
  }),
);

router.get('/participants/total', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  const total = await prisma.participant.count();

  // cache indefinitely - 1 year
  // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
  res.set('Cache-control', 'private, max-age=31536000');
  return res.json({ total });
}));

router.post(
  '/search',
  validate([
    body('query').custom(validateCohortQuery).customSanitizer(sanitizeCohortQuery),
  ]),
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    const sqlQuery = buildCohortQuery(req.body.query, {
      count: true,
    });
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
    const rows = await prisma.$queryRaw(sqlQuery);
    res.json({ count: rows[0].count });
  }),
);

router.get(
  '/:id',
  isPermittedTo('read'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    const cohort = await prisma.cohort.findUniqueOrThrow({
      where: {
        id: req.params.id,
      },
      include: {
        participants: true,
        users: true,
      },
    });
    const { participants, ...rest } = cohort;
    return res.json({
      ...rest,
      participants: participants.length,
    });
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').isString().notEmpty(),
    body('query').isObject(),
    body('published').optional().isBoolean(),
    body('description').optional().isString(),
  ]),
  asyncHandler(async (req, res, next) => {
    const cohort_data = _.flow([
      _.pick(['name', 'query', 'published', 'description']),
      _.omitBy(_.isNil),
    ])(req.body);
    const cohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        users: {
          create: [
            {
              user_id: req.user.id,
            },
          ],
        },
      },
    });
    return res.json(cohort);
  }),
);

router.post('/:id/export', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const cohort = await prisma.cohort.findUnique({
    where: {
      id: parseInt(id, 10),
    },
    include: {
      participants: true,
    },
  });
  const filename = `cohort-${cohort.name}-${new Date().toISOString()}.json`;
  res.attachment(filename);
  res.json(cohort.participants);
}));

module.exports = router;
