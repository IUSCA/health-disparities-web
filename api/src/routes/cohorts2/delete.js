/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { param, query } = require('express-validator');
const createError = require('http-errors');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');

const cohortModel = require('@/services/cohorts/model');
const { canPerformAction } = require('@/services/cohorts/authorization');
const { createSearchDependents } = require('@/services/cohorts/db/search');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

function toJSON(cohort) {
  return {
    ...cohort,
    query: cohortModel.toJSON(cohort.query),
  };
}

router.get(
  '/:id/dependents',
  isPermittedTo('read'),
  validate([
    param('id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'getCohortDependents'
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Get cohorts that depend on this cohort'
    // #swagger.description = 'Requires delete:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[200] = {
        description: 'list of cohorts that depend on this cohort',
        content: {
          "application/json": {
            schema: {
              type: 'Array',
              items: {
                $ref: '#/components/schemas/Cohort'
              }
            }
          }
        }
      }
    */

    const { id } = req.params;
    const cohort = await prisma.cohort_view.findFirstOrThrow({
      where: {
        id,
        is_temp: false,
      },
    });

    if (!canPerformAction('viewDependents', cohort, req.user)) {
      return next(createError(403));
    }

    const searchDependents = createSearchDependents({ user: req.user, id: cohort.id });
    const dependents = await searchDependents(prisma);
    res.json(dependents.map(toJSON));
  }),
);

router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isUUID(),
    query('delete_dependents').default(false).isBoolean().toBoolean(),
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

    const { id } = req.params;
    const cohort = await prisma.cohort_view.findFirstOrThrow({
      where: {
        id,
        is_temp: false,
      },
    });

    if (!canPerformAction('delete', cohort, req.user)) {
      return next(createError(403));
    }

    const idsToDelete = [];
    if (cohort.is_referenced) {
      if (!req.query.delete_dependents) {
        return next(createError(403, 'Cohort is referenced. Use delete_dependents=true to delete it.'));
      }
      const searchDependents = createSearchDependents({ user: req.user, id: cohort.id });
      const dependents = await searchDependents(prisma);
      const dependentCohortIds = dependents.map((c) => c.id);

      idsToDelete.push(id); // delete the cohort itself
      idsToDelete.push(...dependentCohortIds); // delete all dependent cohorts
    } else {
      idsToDelete.push(id);
    }

    const deletes = await prisma.cohort.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });
    return res.json({
      count: deletes.count,
      deletedIds: idsToDelete,
    });
  }),
);

module.exports = router;
