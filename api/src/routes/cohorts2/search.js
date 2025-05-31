/* eslint-disable comment-length/limit-multi-line-comments */
/* eslint-disable comment-length/limit-single-line-comments */
const { performance } = require('perf_hooks');
const express = require('express');
const { query, body } = require('express-validator');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');
const { toTable, toPaginationInfo } = require('@/utils/textTable');

const cohortModel = require('@/services/cohorts/model');
const { CV: COHORT_VISIBILITIES } = require('@/services/cohorts/authorization/constants');
const { createSearch, createCount } = require('@/services/cohorts/db/search');
const { createLogQuery } = require('@/services/cohorts/db/audit');
const { cohortToJSON } = require('@/services/cohorts/utils');
const cohortService = require('@/services/cohorts');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('visibility').optional().isIn(Object.values(COHORT_VISIBILITIES)),
    query('type').optional().isIn([
      cohortModel.PHENOTYPE,
      cohortModel.GENOTYPE,
      cohortModel.COMBINATION]),
    query('archived').default(false).isBoolean().toBoolean(),
    query('derivable').optional().isBoolean().toBoolean(),
    query('created_by_me').isBoolean().optional().toBoolean(),
    // query('shared_with_me').isBoolean().optional().toBoolean(),
    // query('favorited').isBoolean().optional().toBoolean(),
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
    // #swagger.parameters['visibility'] = { description: 'Filter cohorts by their visibility', schema: { @enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] } }
    // #swagger.parameters['type'] = { description: 'Show only cohorts of a certain type', schema: { @enum: ['phenotype', 'genotype', 'combination'] } }
    // #swagger.parameters['archived'] = { description: 'Show only archived cohorts', type: 'boolean' }
    // #swagger.parameters['derivable'] = { description: 'Show only cohorts that can be derived from', type: 'boolean' }
    // #swagger.parameters['created_by_me'] = { description: 'Show only cohorts created by the current user', type: 'boolean' }
    // #swagger.parameters['shared_with_me'] = { description: 'Show only cohorts shared with the current user', type: 'boolean' }
    // #swagger.parameters['favorited'] = { description: 'Show only cohorts favorited by the current user', type: 'boolean' }
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

    const search = createSearch({ filters: req.query, user: req.user, queryParams: req.query });
    const count = createCount({ filters: req.query, user: req.user });
    const [rows, total] = await prisma.$transaction([
      search(prisma),
      count(prisma),
    ]);
    const cohorts = rows.map(cohortToJSON);
    const paginationInfo = {
      total,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    res.format({
      json: () => res.send({
        metadata: paginationInfo,
        data: cohorts,
      }),
      text: () => {
        const columns = ['id', 'name', 'size', 'description', 'author_username', 'visibility'];
        const tableStr = toTable(cohorts, columns);
        const paginationStr = toPaginationInfo(paginationInfo);
        res.send(`${tableStr}\n${paginationStr}`);
      },
    });
  }),
);

router.post(
  '/participants/search',
  isPermittedTo('read'),
  validate([
    body('query').custom(cohortModel.validate).bail().customSanitizer(cohortModel.sanitize),
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
    // rows is like [{count: 123, id: '038ab88f-752b-4ad1-ac1c-56a72a2ff28a'}]
    res.json({
      count: Number(rows[0].count),
      search_id: rows[0].id,
    });

    // log the query and its sql
    const end_time = performance.now();
    const execution_time = end_time - start_time;
    const logQuery = createLogQuery({
      queryJson: _query,
      sqlQuery: searchQuery,
      execution_time,
      author_username: req.user.username,
    });
    logQuery(prisma).catch((e) => {
    // eslint-disable-next-line no-console
      console.error('Error logging cohort search', e);
    });
  }),
);

module.exports = router;
