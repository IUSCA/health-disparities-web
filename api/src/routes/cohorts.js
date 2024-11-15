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

const isPermittedTo = accessControl('cohorts');
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

function toJSON(cohort) {
  return {
    ...cohort,
    query: cohortModel.toJSON(cohort.query),
  };
}

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('is_mine').default(false).toBoolean(),
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
    // #swagger.operationId = 'searchCohorts'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Search cohorts'
    // #swagger.description = 'Search cohorts based on query parameters'
    // #swagger.parameters['search_term'] = { description: 'Filter cohorts by name or description containing search term' }
    // #swagger.parameters['is_mine'] = { description: 'Show only the user\'s cohorts', type: 'boolean' }
    // #swagger.parameters['is_published'] = { description: 'Show only published cohorts', type: 'boolean' }
    // #swagger.parameters['is_locked'] = { description: 'Show only locked cohorts', type: 'boolean' }
    // #swagger.parameters['type'] = { description: 'Show only cohorts of a certain type', enum: ['phenotype', 'genotype', 'combination'] }
    // #swagger.parameters['sort_by'] = { description: 'Sort by a field', enum: ['name', 'size', 'created_at', 'updated_at'], default: 'created_at' }
    // #swagger.parameters['sort_order'] = { description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' }
    // #swagger.parameters['limit'] = { description: 'Limit the number of results', type: 'integer', default: 10 }
    // #swagger.parameters['offset'] = { description: 'Offset the results', type: 'integer', default: 0 }
    /* #swagger.responses[200] = {
        description: 'List of cohorts',
        schema: {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Cohort"
          }
        }
      }
    */
    /* #swagger.security = [{
        "basicAuth": [
            "read:cohorts"
        ]
    }] */

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
    const cohorts = rows.map(toJSON);
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
    // #swagger.operationId = 'getCohortById'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Get a cohort by id'
    // #swagger.description = 'Get a cohort by its id'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true, format: 'uuid' }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        schema: {
          "$ref": "#/definitions/Cohort"
        }
      }
    */

    const cohort = await getCohortById(req.params.id);
    if (!cohort) {
      return res.sendStatus(404);
    }
    res.json(toJSON(cohort));
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
    // #swagger.operationId = 'createCohort'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Create a cohort'
    // #swagger.description = 'Create a cohort based on the query'
    // #swagger.parameters['name'] = { description: 'The cohort name', required: true }
    // #swagger.parameters['query'] = { description: 'The cohort query', required: true }
    // #swagger.parameters['is_published'] = { description: 'Indicates if the cohort is published', type: 'boolean' }
    // #swagger.parameters['is_locked'] = { description: 'Indicates if the cohort is locked', type: 'boolean' }
    // #swagger.parameters['is_protected'] = { description: 'Indicates if the cohort is protected', type: 'boolean' }
    // #swagger.parameters['metadata'] = { description: 'The cohort metadata' }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        schema: {
          "$ref": "#/definitions/Cohort"
        }
      }
    */

    const cohort_data = _.flow([
      _.pick(['name', 'query', 'is_published', 'is_locked', 'is_protected', 'description', 'metadata']),
      _.omitBy(_.isNil),
    ])(req.body);

    // if is_published is true, then is_locked must be true
    if (cohort_data.is_published) {
      cohort_data.is_locked = true;
    }

    const sqlQuery = await cohortService.searchParticipantsQueryAsync({
      schema: cohort_data.query.schema,
      body: {
        ...cohort_data.query.body,
        protocol_id: 1, // todo
        username: req.user.username,
      },
    });
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
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
    return res.json(toJSON(cohort));
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
    // #swagger.operationId = 'updateCohort'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Update a cohort'
    // #swagger.description = 'Update a cohort based on the query'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true, format: 'uuid' }
    // #swagger.parameters['name'] = { description: 'The cohort name', type: 'string' }
    // #swagger.parameters['query'] = { description: 'The cohort query' }
    // #swagger.parameters['is_published'] = { description: 'Indicates if the cohort is published', type: 'boolean' }
    // #swagger.parameters['is_locked'] = { description: 'Indicates if the cohort is locked', type: 'boolean' }
    // #swagger.parameters['is_protected'] = { description: 'Indicates if the cohort is protected', type: 'boolean' }
    // #swagger.parameters['metadata'] = { description: 'The cohort metadata' }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        schema: {
          "$ref": "#/definitions/Cohort"
        }
      }
    */

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
      const sqlQuery = await cohortService.searchParticipantsQueryAsync({
        schema: cohort_data.query.schema,
        body: {
          ...cohort_data.query.body,
          protocol_id: 1, // todo
          username: req.user.username,
        },
      });
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

router.get(
  '/:id/is-deletable',
  isPermittedTo('delete'),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'isCohortDeletable'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Check if a cohort is deletable'
    // #swagger.description = 'Check if a cohort is deletable based on certain conditions'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true, format: 'uuid' }
    /* #swagger.responses[200] = {
        description: 'indicates whether the cohort is deletable',
        schema: {
          type: 'object',
          properties: {
            is_deletable: { type: 'boolean' },
            reason: { type: 'string' },
            dependent_cohorts: { type: 'array', items: { "$ref": "#/definitions/Cohort" } }
          }
        }
      }
    */

    const { id } = req.params;
    const cohort = await prisma.cohort.findFirstOrThrow({
      where: {
        id,
        author_username: req.user.username,
      },
    });

    if (cohort.is_published) {
      return res.json({
        is_deletable: false,
        reason: 'COHORT_IS_PUBLISHED',
      });
    }

    const sql = cohortService.getDependentCohortsQuery(cohort.id, req.user.username);
    const dependentCohorts = await prisma.$queryRaw(sql);
    const isCohortUsedAsDependency = dependentCohorts.length > 0;
    if (isCohortUsedAsDependency) {
      return res.json({
        is_deletable: false,
        reason: 'COHORT_IS_A_DEPENDENCY',
        dependent_cohorts: dependentCohorts,
      });
    }
    return res.json({
      is_deletable: true,
    });
  }),
);

router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isUUID(),
    query('delete_dependents').default(false).toBoolean(),
  ]),
  // eslint-disable-next-line no-unused-vars
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'deleteCohort'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Delete a cohort'
    // #swagger.description = 'Delete a cohort based on its id'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true, format: 'uuid' }
    // #swagger.parameters['delete_dependents'] = { description: 'Delete dependent cohorts', type: 'boolean', default: false }
    /* #swagger.responses[200] = {
        description: 'Number of cohorts deleted',
        schema: {
          type: 'object',
          properties: {
            count: { type: 'integer' }
          }
        }
      }
    */

    // cannot delete a cohort if they are not the author
    // cannot delete a published cohort
    // cannot delete a cohort if it is used in a combination cohort
    const { id } = req.params;
    const cohortToDelete = await prisma.cohort.findFirstOrThrow({
      where: {
        id,
        author_username: req.user.username,
      },
    });

    if (cohortToDelete.is_published) {
      return next(createError(409, 'COHORT_IS_PUBLISHED'));
    }

    const sql = cohortService.getDependentCohortsQuery(cohortToDelete.id, req.user.username);
    const dependentCohorts = await prisma.$queryRaw(sql);
    const dependentCohortIds = dependentCohorts.map((c) => c.id);

    if (req.query.delete_dependents) {
      const idsToDelete = [id, ...dependentCohortIds];
      const deletes = await prisma.cohort.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });
      res.json(deletes); // todo
    }

    if (dependentCohortIds.length > 0) {
      return next(createError(409, {
        reason: 'COHORT_IS_A_DEPENDENCY',
        dependent_cohorts: dependentCohorts,
      }));
    }
    await prisma.cohort.delete({
      where: {
        id,
      },
    });

    res.json({ count: 1 }); // todo
  }),
);

// router.post(
//   '/export/:id',
//   isPermittedTo('read'),
//   validate([
//     param('id').isUUID(),
//   ]),
//   // eslint-disable-next-line no-unused-vars
//   asyncHandler(async (req, res, next) => {
//     // #swagger.operationId = 'exportCohort'
//     // #swagger.tags = ['cohorts', 'public']
//     // #swagger.summary = 'Export a cohort'
//     // #swagger.description = 'Export a cohort based on its id'

//     createError(501, 'Not implemented');
//   }),
// );

router.post(
  '/search-participants',
  isPermittedTo('read'),
  validate([
    body('query')
      .custom(cohortModel.validate)
      .bail()
      .customSanitizer(cohortModel.sanitize),
    query('search_id').optional().isUUID(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'searchParticipants'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Search participants based on a query'
    // #swagger.description = 'creates a temporary cohort based on the query and returns the participant count'
    // #swagger.parameters['search_id'] = { description: 'The id of temporary cohort created from a search', format: 'uuid' }
    // #swagger.parameters['query'] = { description: 'The cohort query', required: true, in: 'body' }
    /* #swagger.responses[200] = {
        description: 'Number of participants found',
        schema: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            search_id: { type: 'string', format: 'uuid' }
          }
        }
      }
    */

    const start_time = performance.now();
    const _query = req.body.query;

    const searchQuery = await cohortService.searchParticipantsQueryAsync({
      schema: _query.schema,
      body: {
        ..._query.body,
        protocol_id: 1, // todo
        username: req.user.username,
      },
    });
    const saveQuery = cohortService.saveSearchResultsQuery(req.query.search_id, searchQuery);
    // console.log('searchQuery:', searchQuery.sql, searchQuery.values);
    // console.log('saveQuery:', saveQuery.sql, saveQuery.values);
    const rows = await prisma.$queryRaw(saveQuery);
    res.json({
      count: Number(rows[0].count),
      search_id: rows[0].id,
    });

    // log the query and its sql
    const end_time = performance.now();
    const execution_time = end_time - start_time;
    logQuery({
      queryJson: _query,
      sqlQuery: searchQuery,
      execution_time,
      author_username: req.user.username,
    });
  }),
);
module.exports = router;
