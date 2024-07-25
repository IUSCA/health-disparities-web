const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body, query } = require('express-validator');
const createError = require('http-errors');
const _ = require('lodash/fp');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');
const cohortService = require('../services/cohorts');
const cohortModel = require('../services/cohorts/model');

const isPermittedTo = accessControl('cohort');
const router = express.Router();

async function getCohortById(id) {
  const sql = cohortService.getCohortByIdQuery(id);
  const cohorts = await prisma.$queryRaw(sql);
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
    console.error('Error logging cohort search', e);
  });
}

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('is_mine').optional().toBoolean(),
    query('is_published').optional().toBoolean(),
    query('is_locked').optional().toBoolean(),
    query('type').optional().isIn([
      cohortModel.PHENOTYPE,
      cohortModel.GENOTYPE,
      cohortModel.COMBINATION]),
    query('sort_by').default('created_at').isIn(['name', 'size', 'created_at', 'updated_at']),
    query('sort_order').default('desc').isIn(['asc', 'desc']),
    query('limit').default(10).isInt({ min: 1, max: 1000 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Search cohorts'

    const data = _.pick(
      ['search_term', 'is_published', 'is_locked', 'is_protected', 'is_mine', 'type'],
    )(req.query);

    //  user can only see their own cohorts or published cohorts
    //  if is_mine is true, then only show the user's cohorts
    //  if is_mine is false, is_published must not be false, otherwise empty array is returned

    if (data.is_mine) {
      data.author_username = req.user.username;
    } else {
      if (data.is_published === false) {
        res.json([]);
        return;
      }
      data.not_author_username = req.user.username;
      data.is_published = true;
    }

    data.is_temp = false;

    const sql = cohortService.searchCohortsQuery(data, {
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    const rows = await prisma.$queryRaw(sql);
    const cohorts = rows.map(cohortModel.toJSON);
    res.json(cohorts);
  }),
);

router.get(
  '/:id',
  isPermittedTo('read'),
  validate([
    param('id').isUUID(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Get a cohort by id'
    const cohort = await getCohortById(req.params.id);
    if (!cohort) {
      return res.sendStatus(404);
    }
    res.json(cohortModel.toJSON(cohort));
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').isString().notEmpty(),
    body('query').custom(cohortModel.validate).bail().customSanitizer(cohortModel.sanitize),
    body('is_published').optional().toBoolean(),
    body('is_locked').optional().toBoolean(),
    body('is_protected').optional().toBoolean(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Create a cohort'

    const cohort_data = _.flow([
      _.pick(['name', 'query', 'is_published', 'is_locked', 'is_protected', 'description', 'metadata']),
      _.omitBy(_.isNil),
    ])(req.body);

    // if is_published is true, then is_locked must be true
    if (cohort_data.is_published) {
      cohort_data.is_locked = true;
    }

    const sqlQuery = await cohortService.searchParticipantsQueryAsync(req.body.query);
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
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        query: true,
        is_published: true,
        is_locked: true,
        is_protected: true,
        metadata: true,
      },
    });

    const cohort = await getCohortById(createdCohort.id);
    return res.json(cohortModel.toJSON(cohort));
  }),
);

router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isUUID(),
    body('name').optional().isString().notEmpty(),
    body('query').optional()
      .custom(cohortModel.validate).bail()
      .customSanitizer(cohortModel.sanitize),
    body('is_published').optional().toBoolean(),
    body('is_locked').optional().toBoolean(),
    body('is_protected').optional().toBoolean(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['cohorts']
  // #swagger.summary = 'Update a cohort'

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
      const sqlQuery = await cohortService.searchParticipantsQueryAsync(cohort_data.query);
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
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        query: true,
        is_published: true,
        is_locked: true,
        is_protected: true,
        metadata: true,
      },
    });

    const cohort = await getCohortById(id);
    return res.json(cohort);
  }),
);

router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isUUID(),
  ]),
  // eslint-disable-next-line no-unused-vars
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Delete a cohort'

    createError(501, 'Not implemented');
  }),
);

router.post(
  '/export/:id',
  isPermittedTo('read'),
  validate([
    param('id').isUUID(),
  ]),
  // eslint-disable-next-line no-unused-vars
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Export a cohort'

    createError(501, 'Not implemented');
  }),
);

router.post(
  '/search-participants',
  isPermittedTo('read'),
  validate([
    body('query')
      .custom(cohortService.validate)
      .bail()
      .customSanitizer(cohortService.sanitize),
    query('search_id').optional().isUUID(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Search participants based on a query'
    /* #swagger.description = 'creates a temporary cohort based on the query and
          returns the participant count'
    */
    const start_time = performance.now();

    const searchQuery = await cohortService.searchParticipantsQueryAsync(req.body.query);
    const saveQuery = cohortService.saveSearchResultsQuery(req.query.search_id, searchQuery);
    const rows = await prisma.$queryRaw(saveQuery);
    res.json({
      count: Number(rows[0].count),
      search_id: rows[0].id,
    });

    // log the query and its sql
    const end_time = performance.now();
    const execution_time = end_time - start_time;
    logQuery({
      queryJson: req.body.query,
      sqlQuery: searchQuery,
      execution_time,
      author_username: req.user.username,
    });
  }),
);
module.exports = router;
