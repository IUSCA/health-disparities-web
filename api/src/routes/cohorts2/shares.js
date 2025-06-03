const express = require('express');
const { param } = require('express-validator');
const createError = require('http-errors');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');

const { canPerformAction } = require('@/services/cohorts/authorization');

const router = express.Router();

router.put(
  '/:cohort_id/:user_id',
  validate([
    param('cohort_id').isUUID(),
    param('user_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'shareCohort'
    // #swagger.tags = ['cohort', 'shares']
    // #swagger.summary = 'Share a cohort'
    // #swagger.description = 'Share a cohort with another user'
    // #swagger.parameters['cohort_id'] = { description: 'The cohort id', required: true }
    // #swagger.parameters['user_id'] = { description: 'The user id to share the cohort with', required: true }
    /* #swagger.responses[201] = {
      description: 'Cohort shared',
      content: {}
      }
    */

    const { cohort_id, user_id } = req.params;

    const cohort = await prisma.cohort_view.findUniqueOrThrow({
      where: { id: cohort_id },
    });

    // access control
    if (!canPerformAction('share', cohort, req.user)) {
      return next(createError(403));
    }

    // user cannot share a cohort with themselves
    if (user_id === req.user.id) {
      return next(createError(400, 'You cannot share a cohort with yourself'));
    }

    // user must exist
    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });
    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // check if share row already exists
    const existingShare = await prisma.cohort_share.findFirst({
      where: {
        cohort_id,
        user_id,
        created_by_id: req.user.id, // ensure the share was created by the requester
      },
    });

    if (!existingShare) {
      await prisma.cohort_share.create({
        data: {
          cohort_id,
          user_id,
          created_by_id: req.user.id,
        },
      });
    }

    res.status(201).send();
  }),
);

router.delete(
  '/:cohort_id/:user_id',
  validate([
    param('cohort_id').isUUID(),
    param('user_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'unshareCohort'
    // #swagger.tags = ['cohort', 'shares']
    // #swagger.summary = 'Unshare a cohort'
    // #swagger.description = 'Unshare a cohort from a user'
    // #swagger.parameters['id'] = { description: 'The share id', required: true }
    /* #swagger.responses[204] = {
      description: 'Cohort unshared',
      content: {}
      }
    */

    const { cohort_id, user_id } = req.params;
    const share = await prisma.cohort_share.findFirstOrThrow({
      where: {
        cohort_id,
        user_id,
        created_by_id: req.user.id, // ensure the share was created by the requester
      },
    });

    await prisma.cohort_share.delete({
      where: { id: share.id },
    });

    res.status(204).send();
  }),
);

router.get(
  '/:cohort_id',
  validate([
    param('cohort_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'getCohortShares'
    // #swagger.tags = ['cohort', 'shares']
    // #swagger.summary = 'Get all shares created by the requester for a given cohort'
    // #swagger.description = 'Returns all cohort shares created by the requester for the specified cohort'
    // #swagger.parameters['cohort_id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[200] = {
      description: 'List of shares',
      content: {}
      }
    */

    const { cohort_id } = req.params;

    const rows = await prisma.cohort_share.findMany({
      where: {
        cohort_id,
        created_by_id: req.user.id,
      },
      include: {
        user: true,
      },
    });

    const users = rows.map((row) => row.user);

    res.json(users);
  }),
);

module.exports = router;
