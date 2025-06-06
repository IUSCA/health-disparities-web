/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { body, param } = require('express-validator');
const _ = require('lodash/fp');
const createError = require('http-errors');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');

const cohortModel = require('@/services/cohorts/model');
const cohortService = require('@/services/cohorts');
const { cohortToJSON } = require('@/services/cohorts/utils');
const { canPerformAction, canChangeVisibility } = require('@/services/cohorts/authorization');
const { CV } = require('@/services/cohorts/authorization/constants');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isUUID(),
    body('name').optional().isString().notEmpty(),
    body('description').isString().isLength({ min: 10 }),
    body('query').optional()
      .custom(cohortModel.validate).bail()
      .customSanitizer(cohortModel.sanitize),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res, next) => {
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
    const { id } = req.params;
    const cohort = await prisma.cohort_view.findUniqueOrThrow({
      where: { id },
    });
    if (!canPerformAction('update', cohort, req.user)) {
      return next(createError(403));
    }

    const data = _.pick(['name', 'query', 'description', 'metadata'])(req.body);
    if (data.metadata) {
      data.metadata = _.merge(cohort?.metadata)(data.metadata); // deep merge
    }

    if (data.query) {
      const sqlQuery = await cohortService.searchParticipantsQueryAsync({
        schema: data.query.schema,
        body: {
          ...data.query.body,
          protocol_id: 1, // todo
          username: req.user.username,
        },
      });
      // eslint-disable-next-line no-console
      // console.log(sqlQuery.sql, sqlQuery.values);
      const rows = await prisma.$queryRaw(sqlQuery);
      // rows is like [{participant_id: 1}, {participant_id: 2}, ...]
      const participants_ids = rows.map((row) => row.participant_id);
      data.participants = participants_ids;
    }

    await prisma.cohort.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
      },
    });

    const updatedCohort = await prisma.cohort_view.findUniqueOrThrow({
      where: { id },
    });
    res.json(cohortToJSON(updatedCohort));
  }),
);

router.post('/:id/actions/:action', validate([
  param('id').isUUID(),
  param('action').isIn(['archive', 'unarchive']),
]), asyncHandler(async (req, res, next) => {
  // #swagger.operationId = 'actOnCohort'
  // #swagger.tags = ['cohorts']
  // #swagger.summary = 'Perform an action on a cohort'
  // #swagger.description = 'Requires update:cohorts scope'
  // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
  // #swagger.parameters['action'] = { description: 'The action to perform', required: true, schema: { type: 'string', enum: ['archive', 'unarchive'] } }
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

  const { id, action } = req.params;
  const cohort = await prisma.cohort_view.findUniqueOrThrow({
    where: { id },
  });

  if (!canPerformAction(action, cohort, req.user)) {
    return next(createError(403));
  }

  // archive
  if (action === 'archive') {
    await prisma.cohort.update({
      where: { id },
      data: {
        is_archived: true,
        is_locked: true,
        is_derivable: false,
      },
    });
  }

  // unarchive
  if (action === 'unarchive') {
    await prisma.cohort.update({
      where: { id },
      data: {
        is_archived: false,
        is_locked: cohort.visibility === CV.PRIVATE ? false : cohort.is_locked,
        is_derivable: true,
      },
    });
  }

  const updatedCohort = await prisma.cohort_view.findUniqueOrThrow({
    where: { id },
  });
  res.json(cohortToJSON(updatedCohort));
}));

router.patch('/:id/visibility', validate([
  param('id').isUUID(),
  body('visibility').isIn(Object.values(CV)),
]), asyncHandler(async (req, res, next) => {
  // #swagger.operationId = 'changeCohortVisibility'
  // #swagger.tags = ['cohorts']
  // #swagger.summary = 'Change cohort visibility'
  // #swagger.description = 'Requires update:cohorts scope'
  // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
  // #swagger.requestBody = {
  //   description: 'Visibility change request',
  //   content: {
  //     'application/json': {
  //       schema: {
  //         type: 'object',
  //         properties: {
  //           visibility: { type: 'string', enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] },
  //         },
  //         required: ['visibility'],
  //       },
  //     },
  //   },
  // }

  const { id } = req.params;
  const { visibility: to } = req.body;

  const cohort = await prisma.cohort_view.findUniqueOrThrow({
    where: { id },
    include: {
      author: true,
    },
  });

  if (!canChangeVisibility({
    from: cohort.visibility,
    to,
    cohort,
    user: req.user,
  })) {
    return next(createError(403));
  }

  const transitionKey = `${cohort.visibility}->${to}`;
  const transitionEffect = {
    'PRIVATE->UNLISTED': { is_locked: true },
    'UNLISTED->PRIVATE': { is_locked: false },
    'UNLISTED->PUBLIC': { is_locked: true },
    'PUBLIC->UNLISTED': { is_locked: true },
  };

  // unlisted -> private
  // delete all shares and delete all favorites except the author's

  await prisma.$transaction(async (tx) => {
    if (transitionKey === 'UNLISTED->PRIVATE') {
      await tx.cohort_share.deleteMany({
        where: {
          cohort_id: id,
        },
      });

      await tx.cohort_favorite.deleteMany({
        where: {
          cohort_id: id,
          user_id: { not: cohort.author.id },
        },
      });
    }

    await tx.cohort.update({
      where: { id },
      data: {
        visibility: to,
        ...transitionEffect[transitionKey],
      },
    });
  });

  const updatedCohort = await prisma.cohort_view.findUniqueOrThrow({
    where: { id },
  });
  res.json(cohortToJSON(updatedCohort));
}));

module.exports = router;
