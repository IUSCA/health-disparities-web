/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { query } = require('express-validator');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');
const { toTable, toPaginationInfo } = require('@/utils/textTable');

const cohortModel = require('@/services/cohorts/model');
const { CV: COHORT_VISIBILITIES } = require('@/services/cohorts/authorization/constants');
const { createSearch, createCount } = require('@/services/cohorts/db/search');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

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
    query('visibility').optional().isIn(Object.values(COHORT_VISIBILITIES)),
    query('type').optional().isIn([
      cohortModel.PHENOTYPE,
      cohortModel.GENOTYPE,
      cohortModel.COMBINATION]),
    query('archived').default(false).isBoolean().toBoolean(),
    query('derivable').optional().isBoolean().toBoolean(),
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
    const cohorts = rows.map(toJSON);
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

module.exports = router;
