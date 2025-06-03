const express = require('express');
const { param } = require('express-validator');
const createError = require('http-errors');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');

const { canPerformAction } = require('@/services/cohorts/authorization');

const router = express.Router();

router.put(
  '/:cohort_id',
  validate([
    param('cohort_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'favoriteCohort'
    // #swagger.tags = ['cohorts', 'favorites']
    // #swagger.summary = 'Favorite a cohort'
    // #swagger.description = 'Add a cohort to the user\'s favorites'
    // #swagger.parameters['cohort_id'] = { description: 'The cohort id', required: true }
    // #swagger.parameters['user_id'] = { description: 'The user id to favorite the cohort for', required: true }
    /* #swagger.responses[201] = {
      description: 'Cohort favorited',
      content: {}
      }
    */

    const { cohort_id } = req.params;

    const cohort = await prisma.cohort_view.findUniqueOrThrow({
      where: { id: cohort_id },
    });

    // access control: if the user can view the cohort
    // then they can favorite it
    if (!canPerformAction('view', cohort, req.user)) {
      return next(createError(403));
    }

    try {
      await prisma.cohort_favorite.create({
        data: {
          cohort_id,
          user_id: req.user.id,
        },
      });
      res.status(201).send();
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint failed, meaning the favorite already exists
        // idempotency: if the favorite already exists, we can return 201
        res.status(201).send();
      }
      // Handle other errors
      throw error;
    }
  }),
);

router.delete(
  '/:cohort_id',
  validate([
    param('cohort_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'unfavoriteCohort'
    // #swagger.tags = ['cohorts', 'favorites']
    // #swagger.summary = 'Unfavorite a cohort'
    // #swagger.description = 'Remove a cohort from the user\'s favorites'
    // #swagger.parameters['cohort_id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[204] = {
      description: 'Cohort unfavorited',
      content: {}
      }
    */

    const { cohort_id } = req.params;

    await prisma.cohort_favorite.delete({
      where: {
        cohort_id_user_id: {
          cohort_id,
          user_id: req.user.id,
        },
      },
    });

    res.status(204).send();
  }),
);

module.exports = router;
