/* eslint-disable comment-length/limit-multi-line-comments */
/* eslint-disable comment-length/limit-single-line-comments */
const assert = require('assert');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body, query } = require('express-validator');
const createError = require('http-errors');
const _ = require('lodash/fp');
const { performance } = require('perf_hooks');
const config = require('config');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl, allowOnlyAccessKeys } = require('../middleware/auth');
const cohortService = require('../services/cohorts');
const cohortModel = require('../services/cohorts/model');
const datasetService = require('../services/dataset');
const { toTable, toPaginationInfo } = require('../utils');

const isPermittedTo = accessControl('cohorts');
const router = express.Router();

async function getCohortById(id, username) {
  const sql = cohortService.getCohortByIdQuery(id, username);
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
    // #swagger.operationId = 'searchCohorts'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Search cohorts'
    // #swagger.description = 'Search cohorts based on query parameters. Requires read:cohorts scope.'
    // #swagger.parameters['search_term'] = { description: 'Filter cohorts by name or description containing search term' }
    // #swagger.parameters['is_mine'] = { description: 'Show only the user\'s cohorts', type: 'boolean' }
    // #swagger.parameters['is_published'] = { description: 'Show only published cohorts', type: 'boolean' }
    // #swagger.parameters['is_locked'] = { description: 'Show only locked cohorts', type: 'boolean' }
    // #swagger.parameters['type'] = { description: 'Show only cohorts of a certain type', schema: { @enum: ['phenotype', 'genotype', 'combination'] } }
    // #swagger.parameters['sort_by'] = { description: 'Sort by a field', schema: { @enum: ['name', 'size', 'created_at', 'updated_at'], default: 'created_at' }  }
    // #swagger.parameters['sort_order'] = { description: 'Sort order', schema: { @enum: ['asc', 'desc'], default: 'desc' } }
    // #swagger.parameters['limit'] = { description: 'Limit the number of results', type: 'integer' }
    // #swagger.parameters['offset'] = { description: 'Offset the results', type: 'integer' }
    /* #swagger.responses[200] = {
        description: 'List of cohorts',
        content: {
          'application/json': {
            schema: {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Cohort"
              }
            }
          },
          'text/plain': {
            schema: {
              type: 'string',
              description: 'A text table of the cohorts',
            }
          }
        }
      }
    */

    const data = _.pick(
      ['search_term', 'is_published', 'is_locked', 'is_protected', 'is_mine', 'type'],
    )(req.query);

    // A user can only see their own cohorts or published cohorts
    // The superset of all cohorts that a user can see is: cohort's owned by them union publsished cohorts
    // select * from cohort c where c.author_username = $1 or c.is_published = true

    // is_mine: true, is_published: null -    where (c.author_username = $1 or c.is_published = true) and (c.author_username = $1)                              - all user's cohorts whether published or not
    // is_mine: false, is_published: null -   where (c.author_username = $1 or c.is_published = true) and (c.author_username != $1)                             - all published cohorts not owned by the user
    // is_mine: null, is_published: null -    where (c.author_username = $1 or c.is_published = true)                                                           - all cohorts that are either owned by the user or published
    // is_mine: true, is_published: false -   where (c.author_username = $1 or c.is_published = true) and c.author_username = $1    and c.is_published = false  - all user's cohorts that are not published
    // is_mine: false, is_published: false -  where (c.author_username = $1 or c.is_published = true) and c.author_username != $1   and c.is_published = false  - empty
    // is_mine: null, is_published: false -   where (c.author_username = $1 or c.is_published = true)                               and c.is_published = false  - all user's cohorts that are not published
    // is_mine: true, is_published: true -    where (c.author_username = $1 or c.is_published = true) and c.author_username = $1    and c.is_published = true   - all published cohorts owned by the user
    // is_mine: false, is_published: true -   where (c.author_username = $1 or c.is_published = true) and c.author_username != $1   and c.is_published = true   - all published cohorts not owned by the user
    // is_mine: null, is_published: true -    where (c.author_username = $1 or c.is_published = true)                               and c.is_published = true   - all published cohorts

    // equivalences
    // is_mine: false, is_published: null -    is_mine: false, is_published: true
    // is_mine: null, is_published: false -    is_mine: true, is_published: false

    if (data.is_mine) {
      data.author_username = req.user.username;
    } else if (data.is_mine === false) {
      // early termination
      if (data.is_published === false) {
        res.json([]);
        return;
      }
      data.not_author_username = req.user.username;
    } else {
      // is_mine is null
      data.author_username = null;
    }

    data.is_temp = false;

    const sql = cohortService.searchCohortsQuery(req.user.username, data, {
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    const rows = await prisma.$queryRaw(sql);
    const cohorts = rows.map(toJSON);

    res.format({
      json: () => res.send(cohorts),
      text: () => {
        const columns = ['id', 'name', 'size', 'description', 'author_username'];
        const tableStr = toTable(cohorts, columns);
        res.send(tableStr);
      },
    });
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
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        content: {
          'application/json': {
            schema: {
              "$ref": "#/components/schemas/Cohort"
            }
          }
        }
      }
    */

    const cohort = await getCohortById(req.params.id, req.user.username);
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
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Create a cohort'
    // #swagger.description = 'Requires create:cohorts scope'
    // #swagger.requestBody = { $ref: '#/components/requestBodies/Cohort' }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        content: {
          'application/json': {
            schema: {
              "$ref": "#/components/schemas/Cohort"
            }
          }
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
      },
    });

    const cohort = await getCohortById(createdCohort.id, req.user.username);
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
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Update a cohort'
    // #swagger.description = 'Requires update:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    // #swagger.requestBody = { $ref: '#/components/requestBodies/Cohort' }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        content: {
          'application/json': {
            schema: {
              "$ref": "#/components/schemas/Cohort"
            }
          }
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
      },
    });

    const cohort = await getCohortById(id, req.user.username);
    return res.json(cohort);
  }),
);

router.get(
  '/:id/is-deletable',
  isPermittedTo('delete'),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'isCohortDeletable'
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Check if a cohort is deletable'
    // #swagger.description = 'Requires delete:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[200] = {
        description: 'indicates whether the cohort is deletable',
        content: {
          "application/json": {
            schema: {
              type: 'object',
              properties: {
                is_deletable: { type: 'boolean' },
                reason: { type: 'string' },
                dependent_cohorts: { type: 'array', items: { $ref: '#/components/schemas/Cohort' } },
              },
            }
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
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Delete a cohort'
    // #swagger.description = 'Requires delete:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    // #swagger.parameters['delete_dependents'] = { description: 'Delete dependent cohorts', type: 'boolean' }
    /* #swagger.responses[200] = {
        description: 'Number of cohorts deleted',
        content: {
          "application/json": {
            schema: {
              type: 'object',
              properties: {
                count: { type: 'integer' }
              }
            }
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
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Search participants based on a query'
    // #swagger.description = 'Creates a temporary cohort based on the query and returns the participant count. Requires read:cohorts scope.'
    // #swagger.parameters['search_id'] = { description: 'The id of temporary cohort created from a search' }
    /*  #swagger.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: 'object',
                properties: {
                  query: {
                    $ref: '#/components/schemas/CohortQuery'
                  }
                },
              },
              examples: {
                "phenotype": {
                  value: {"query":{"schema":{"name":"phenotype","namespace":"edu.iu.biobank","version":"1.0.0"},"body":{"filters":{"operator":"AND","children":[{"field":"demographic.gender","operator":"in","value":["F"]},{"field":"demographic.age","operator":"gt","value":"30"}]},"snapshot_id":1}}},
                },
                "genotype": {
                  value: {"query":{"schema":{"name":"genotype","namespace":"edu.iu.biobank","version":"1.0.0"},"body":{"filters":{"operator":"AND","children":[]},"ranges":[{"text":"GAB4","type":"gene","value":{"name":"GAB4"}}],"zygosities":["HET","HOMALT"],"snapshot_id":1,"source_id":3}}},
                },
                "combination": {
                  value: {"query":{"schema":{"name":"combination","namespace":"edu.iu.biobank","version":"1.0.0"},"body":{"cohort_ids":["038ab88f-752b-4ad1-ac1c-56a72a2ff28a","d7f3a892-5ca4-42c6-8709-c4a0921ddfa7"],"operators":["union"]}}}
                },
              }

            }
          }
        }
    */
    /* #swagger.responses[200] = {
        description: 'Number of participants found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: { type: 'integer' },
                search_id: { type: 'string' }
              }
            }
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

router.get(
  '/:id/files/summary',
  isPermittedTo('read'),
  validate([
    param('id').isUUID(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'getCohortFilesSummary'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Get a summary of files in a cohort'
    // #swagger.description = 'Requires read:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[200] = {
        description: 'Cohort file summary',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                counts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      file_type: { type: 'string' },
                      file_count: { type: 'integer' },
                      total_size: { type: 'number' },
                    }
                  }
                },
              },
            },
          },
          'text/plain': {
            schema: {
              type: 'string',
              description: 'A text table of the cohort files summary',
            }
          }
        },
      }
    */

    const cohort = await getCohortById(req.params.id, req.user.username);
    if (!cohort) {
      return res.sendStatus(404);
    }

    const sql = cohortService.getCohortFilesSummaryQuery({ id: req.params.id });
    // console.log(sql.sql, sql.values);
    const data = await prisma.$queryRaw(sql);
    res.format({
      json: () => res.json(data),
      text: () => {
        const tableStr = toTable(data);
        return res.send(tableStr);
      },
    });
  }),
);

router.get(
  '/:id/files',
  allowOnlyAccessKeys,
  accessControl('cohort_data')('read'),
  validate([
    param('id').isUUID(),
    query('sort_by').default('id').isIn(['id', 'name', 'size']),
    query('sort_order').default('asc').isIn(['asc', 'desc']),
    query('limit').default(100).isInt({ min: 1, max: 1000 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'getCohortFiles'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'List data files for a cohort'
    // #swagger.description = 'Requires read:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    // #swagger.parameters['sort_by'] = { description: 'Sort by a field', schema: { @enum: ['name', 'size', 'id'], default: 'id' }  }
    // #swagger.parameters['sort_order'] = { description: 'Sort order', schema: { @enum: ['asc', 'desc'], default: 'asc' } }
    // #swagger.parameters['limit'] = { description: 'Limit the number of results', type: 'integer' }
    // #swagger.parameters['offset'] = { description: 'Offset the results', type: 'integer' }
    /* #swagger.responses[200] = {
        description: 'The cohort files',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  md5: { type: 'string' },
                  size: { type: 'number' },
                  participant_id: { type: 'string' },
                },
              },
            },
          },
          'text/plain': {
            schema: {
              type: 'string',
              description: 'A text table of the cohort files',
            }
          }
        },
      },
    */

    // check if user has permission to access the cohort
    const access_request = await prisma.cohort_access_request.findFirst({
      where: {
        requester_id: req.user.id,
        cohort_id: req.params.id,
        status: 'APPROVED',
      },
    });

    if (!access_request) {
      return next(createError(403, "You do not have permission to access this cohort's data.")); // Forbidden
    }

    const sql = cohortService.getCohortFilesQuery({
      id: req.params.id,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const files = await prisma.$queryRaw(sql);
    const total_count = Number(files?.[0]?.total_count || 0);

    const mapper = _.flow([
      _.omit(['total_count']), // remove total_count from each file
      (f) => ({ // add download url
        ...f,
        url: `${config.get('api_url')}/cohorts/files/download/${f.id}`,
      }),
    ]);

    res.format({
      json: () => {
        res.json({
          data: files.map(mapper),
          metadata: {
            total: total_count,
            limit: req.query.limit,
            offset: req.query.offset,
          },
        });
      },
      text: () => {
        const columns = ['id', 'name', 'md5', 'size', 'participant_id'];
        const tableStr = toTable(files.map(mapper), columns);
        const paginationStr = toPaginationInfo({
          total: total_count,
          limit: req.query.limit,
          offset: req.query.offset,
        });
        res.send(`${tableStr}\n${paginationStr}`);
      },
    });
  }),
);

router.get(
  '/files/download/:file_id',
  allowOnlyAccessKeys,
  accessControl('cohort_data')('read'),
  validate([
    param('file_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'downloadCohortFile'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Download a cohort file'
    /* #swagger.description =
        Requires read:cohorts scope.
        <br/><br/>
        To download the file and save it with the original name, use the following command:
        <pre>curl -J -O -u {key}:{secret} -X GET "{base_url}/cohorts/files/download/{file_id}"</pre>
      */
    // #swagger.parameters['file_id'] = { description: 'The cohort file id', required: true }
    /* #swagger.responses[200] = {
          description: 'Download file',
          content: {
            'application/octet-stream': {
              schema: {
                type: 'string',
                format: 'binary',
              },
            },
          },
          "headers": {
            "Content-Disposition": {
              "schema": {
                "type": "string"
              },
              "description": "Indicates that the response should be treated as a file download"
            }
          }
        },
      */
    /* #swagger.responses[202] = {
      description: 'File is being staged',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    }
  */

    // check if the requester has access to the file
    // file -> dataset -> participant -> zero or more cohorts -> cohort_access_request -> requester
    // if the requester is granted access to any cohort, they can download the file
    // otherwise, return 403

    // To download a file, get its dataset
    // If the dataset is staged, send an internal redirect to the file server with staged path
    // otherwise, try to initiate the staging workflow and return http code 202, with a message to the user to check back later

    const sql = cohortService.getFileInfoQuery({ user_id: req.user.id, file_id: req.params.file_id });
    // console.log(sql.sql, sql.values);
    const files = await prisma.$queryRaw(sql);
    if (!files || files.length === 0) {
      return next(createError(403, 'You do not have permission to access this file.')); // Forbidden
    }

    const file = files[0];
    // console.log(JSON.stringify(file, null, 2));

    const dataset = await datasetService.get_dataset({
      id: file.dataset_id,
      workflows: true,
    });

    if (dataset.is_staged && dataset.metadata.stage_alias) {
      // send an internal redirect to the reverse proxy server with staged path
      const staged_file_path = `${dataset.metadata.stage_alias}/${file.path}`;
      // console.log('staged_file_path:', staged_file_path);
      res.set('X-Accel-Redirect', `/data/${staged_file_path}`);

      // make browser download response instead of attempting to render it
      res.set('Content-Type', 'application/octet-stream');
      // set content-disposition to attachment and set the filename to the original file name
      // use -J -O flags while using curl to download with the correct filename
      res.set('Content-Disposition', `attachment; filename="${file.name}"`);

      // makes nginx not cache the response file
      // otherwise the response cuts off at 1GB as the max buffer size is reached
      // and the file download fails
      // https://stackoverflow.com/a/64282626
      res.set('X-Accel-Buffering', 'no');
      res.send('');
    } else {
      // try to initiate the staging workflow and return http code 202,
      // with a message to the user to check back later
      const wf_name = 'stage';
      try {
        await datasetService.create_workflow(dataset, wf_name, req.user.id);
      } catch (e) {
        // catch assertion error thrown when there is a pending / running workflow
        if (e instanceof assert.AssertionError) {
          // do nothing
        } else {
          // re-throw the error
          console.error(e);
          throw e;
        }
      }

      res.set('Retry-After', 60); // tell the client to retry after 60 seconds
      res.set('Cache-control', 'no-store');
      res.status(202).json({
        message: 'The file is currently being staged. Please check back later.',
      });
    }
  }),
);

module.exports = router;
