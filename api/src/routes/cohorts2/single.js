const express = require('express');
const { param } = require('express-validator');
const createError = require('http-errors');

const yaml = require('js-yaml');
const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');

const { canPerformAction, getPossibleActions } = require('@/services/cohorts/authorization');
const { cohortToJSON } = require('@/services/cohorts/utils');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

router.get(
  '/:id',
  isPermittedTo('read'),
  validate([
    param('id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
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

    const cohort = await prisma.cohort_view.findUniqueOrThrow({
      where: {
        id: req.params.id,
      },
      include: {
        author: true,
      },
    });

    // access control
    if (!canPerformAction('view', cohort, req.user)) {
      return next(createError(403));
    }

    cohort.permittedActions = getPossibleActions(cohort, req.user);

    // res.json(toJSON(cohort));
    const cohortJSON = cohortToJSON(cohort);
    res.format({
      json: () => res.send(cohortJSON),
      text: () => {
        // res.send(JSON.stringify(cohortJSON, null, 2));
        const yamlText = yaml.dump(cohortJSON, { noRefs: true, lineWidth: 100 });
        res.send(yamlText);
      },
    });
  }),
);

module.exports = router;
