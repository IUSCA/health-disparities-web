const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body, query } = require('express-validator');
const _ = require('lodash/fp');

const prisma = new PrismaClient();
const { performance } = require('perf_hooks');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');
const {
  searchCohortsQuery, getCohortByIdQuery, saveSearchResults, searchParticipants,
} = require('../services/cohort');
const {
  validateCohortQuery, sanitizeCohortQuery, COMBINATION_QUERY, GENOTYPE_QUERY, PHENOTYPE_QUERY,
} = require('../services/cohort/validation');

const { CATEGORIES } = require('../services/cohort/fields');

const isPermittedTo = accessControl('cohort');
const router = express.Router();

async function getCohortById(id) {
  const sqlQuery = getCohortByIdQuery(id);
  const cohorts = await prisma.$queryRaw(sqlQuery);
  return cohorts[0];
}

// asynchronously log the query and its sql
// ignore errors
function logQuery({
  queryJson, sqlQuery, execution_time, author_username,
}) {
  return prisma.query_analytics.create({
    data: {
      query: queryJson,
      sql: sqlQuery.sql,
      values: sqlQuery.values,
      author_username,
      execution_time,
    },
  }).catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
  });
}

router.get(
  '/:category/:field/unique',
  accessControl('participant')('read'),
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
  '/:category/:field/startswith/:prefix',
  accessControl('participant')('read'),
  validate([
    param('category').isIn(CATEGORIES),
    query('limit').optional().default(10).isInt({ min: 1, max: 1000 })
      .toInt(),
    query('offset').optional().default(0).isInt({ min: 0 })
      .toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    const { category, field } = req.params;
    const _rows = await prisma[category].findMany({
      where: {
        [field]: {
          startsWith: req.params.prefix || '',
        },
      },
      orderBy: {
        [field]: 'asc',
      },
      take: req.query.limit,
      skip: req.query.offset,
      distinct: [field],
    });

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    // res.set('Cache-control', 'private, max-age=31536000');
    return res.json(_rows.map((row) => row[field]));
  }),
);

router.get(
  '/dxname',
  accessControl('participant')('read'),
  validate([
    query('limit').optional().default(10).isInt({ min: 1, max: 1000 })
      .toInt(),
    query('offset').optional().default(0).isInt({ min: 0 })
      .toInt(),
    query('text').default(''),
  ]),
  asyncHandler(async (req, res, next) => {
    const searchText = req.query.text || '';
    const _rows = await prisma.$queryRaw`
      select name
      from dx_unique_name dun
      where similarity(name, ${searchText}) >= 0.1
      order by similarity(name, ${searchText}) desc
      limit ${req.query.limit}
      offset ${req.query.offset}
    `;

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    // res.set('Cache-control', 'private, max-age=31536000');
    return res.json(_rows.map((row) => row.name));
  }),
);

router.get(
  '/participants/total',
  accessControl('participant')('read'),
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
    query('save_results').optional().default(false).toBoolean(),
  ]),
  isPermittedTo('create'),
  asyncHandler(async (req, res, next) => {
    // if save_results is true, save the search results to the cohort table as a temporary cohort
    // and return that cohort's id as search_id
    const start_time = performance.now();
    if (req.query.save_results) {
      const searchQuery = searchParticipants(req.body.query);
      const createQuery = saveSearchResults(req.query.search_id, searchQuery);
      // console.log(searchQuery.sql, searchQuery.values);
      const rows = await prisma.$queryRaw(createQuery);

      const end_time = performance.now();
      logQuery({
        queryJson: req.body.query,
        sqlQuery: searchQuery,
        execution_time: end_time - start_time,
        author_username: req.user.username,
      });

      res.json({
        count: Number(rows[0].count),
        search_id: rows[0].id,
      });
    } else {
      const sqlQuery = searchParticipants(req.body.query, {
        count: true,
      });
      // eslint-disable-next-line no-console
      console.log(sqlQuery.sql, sqlQuery.values);
      const rows = await prisma.$queryRaw(sqlQuery);

      const end_time = performance.now();
      if (req.body.query.name !== COMBINATION_QUERY) {
        logQuery({
          queryJson: req.body.query,
          sqlQuery,
          execution_time: end_time - start_time,
          author_username: req.user.username,
        });
      }

      res.json({ count: Number(rows[0].count) });
    }
  }),
);

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('is_mine').optional().toBoolean(),
    query('is_published').optional().toBoolean(),
    query('is_locked').optional().toBoolean(),
    query('type').optional().isIn([PHENOTYPE_QUERY, GENOTYPE_QUERY, COMBINATION_QUERY]),
    query('sort_by').optional().isIn(['name', 'size', 'created_at', 'updated_at']),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('limit').optional().default(10).isInt({ min: 1, max: 1000 })
      .toInt(),
    query('offset').optional().default(0).isInt({ min: 0 })
      .toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Filter cohorts.'

    //  user can only see their own cohorts or published cohorts
    //  if is_mine is true, then only show the user's cohorts
    //  if is_mine is false, is_published must not be false, otherwise empty array is returned

    const data = _.pick(
      ['search_term', 'is_published', 'is_locked', 'is_protected', 'is_mine', 'type'],
    )(req.query);
    if (data.is_mine) {
      data.author_username = req.user.username;
    } else {
      if (data.is_published === false) {
        res.json([]);
        return;
      }
      data.author_username = req.user.username;
      data.is_published = true;
    }

    // if name is empty string, remove it from the query
    if (data.name === '') {
      delete data.name;
    }

    data.is_temp = false;
    const sqlQuery = searchCohortsQuery(data, {
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
    const cohorts = await prisma.$queryRaw(sqlQuery);
    res.json(cohorts);
  }),
);

router.get(
  '/:id',
  isPermittedTo('read'),
  validate([
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
    body('is_published').optional().toBoolean(),
    body('is_locked').optional().toBoolean(),
    body('is_protected').optional().toBoolean(),
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

    // if is_published is true, then is_locked must be true
    if (cohort_data.is_published) {
      cohort_data.is_locked = true;
    }

    const sqlQuery = searchParticipants(req.body.query);
    // eslint-disable-next-line no-console
    // console.log(sqlQuery.sql, sqlQuery.values);
    const rows = await prisma.$queryRaw(sqlQuery);

    // rows is like [{participant_id: 1}, {participant_id: 2}, ...]
    const participants_ids = rows.map((row) => row.participant_id);

    const createdCohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        author_username: req.user.username,
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
    body('name').optional().isString().notEmpty(),
    body('query').optional()
      .custom(validateCohortQuery).bail()
      .customSanitizer(sanitizeCohortQuery),
    body('is_published').optional().toBoolean(),
    body('is_locked').optional().toBoolean(),
    body('is_protected').optional().toBoolean(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Modify cohort.'

    // user role can modify cohort if they are the author
    const { id } = req.params;
    const cohortToUpdate = await prisma.cohort.findFirstOrThrow({
      where: {
        id,
        author_username: req.user.username,
      },
    });

    // cannot update a locked cohort
    if (cohortToUpdate.is_locked) {
      return res.status(403).json({ error: 'Cannot update a locked cohort.' });
    }

    const cohort_data = _.pick(
      ['name', 'query', 'is_published', 'is_locked', 'is_protected', 'description', 'metadata'],
    )(req.body);

    // if is_published is true, then is_locked must be true
    if (cohort_data.is_published) {
      cohort_data.is_locked = true;
    }

    if (cohort_data.metadata) {
      cohort_data.metadata = _.merge(cohortToUpdate?.metadata)(cohort_data.metadata); // deep merge
    }

    if (cohort_data.query) {
      const sqlQuery = searchParticipants(cohort_data.query);
      // eslint-disable-next-line no-console
      // console.log(sqlQuery.sql, sqlQuery.values);
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
    // CATEGORIES.map(async (category) => {
    //   const sqlQuery = getDataQuery(category, id);
    //   const rows = await prisma.$queryRaw(sqlQuery);
    // });

    // const filename = `cohort-${cohort.name}-${new Date().toISOString()}.json`;
    // res.attachment(filename);
    res.json({});
  }),
);

module.exports = router;
