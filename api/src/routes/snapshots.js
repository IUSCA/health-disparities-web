const express = require('express');
const { PrismaClient } = require('@prisma/client');
const createError = require('http-errors');
const { param, body } = require('express-validator');
const _ = require('lodash/fp');
const dayjs = require('dayjs');

const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');

const isPermittedTo = accessControl('snapshot');
const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['snapshots']
    const _snapshots = await prisma.snapshot.findMany({
      include: {
        enrolls: {
          select: {
            id: true,
          },
        },
        disenrolls: {
          select: {
            id: true,
          },
        },
        author: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    const snapshots = _snapshots.map((snapshot) => {
      const { enrolls, disenrolls, ...rest } = snapshot;
      return {
        ...rest,
        enrolls: enrolls.length,
        disenrolls: disenrolls.length,
      };
    });
    res.json(snapshots);
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').exists(),
    body('timestamp').optional().isISO8601({ strict: true }).customSanitizer((value) => dayjs(value).toDate()),
    body('published').toBoolean(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['snapshots']
    const data = _.flow([
      _.pick(['name', 'description', 'timestamp', 'published']),
      _.omitBy(_.isNil),
    ])(req.body);
    const snapshot = await prisma.snapshot.create({
      data: {
        ...data,
        author_id: req.user.id,
      },
    });
    res.json(snapshot);
  }),
);

router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isInt().toInt(),
    body('timestamp').optional().isISO8601({ strict: true }).customSanitizer((value) => dayjs(value).toDate()),
    body('published').toBoolean(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['snapshots']
    const data = _.pick(['name', 'description', 'timestamp', 'published'])(req.body);
    const snapshot = await prisma.snapshot.update({
      where: {
        id: req.params.id,
      },
      data,
    });
    res.json(snapshot);
  }),
);

// only empty snapshots can be deleted
router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['snapshots']
    const snapshot = await prisma.snapshot.findUniqueOrThrow({
      where: {
        id: req.params.id,
      },
      include: {
        enrolls: {
          select: {
            id: true,
          },
        },
        disenrolls: {
          select: {
            id: true,
          },
        },
      },
    });

    if (snapshot.enrolls.length === 0 && snapshot.disenrolls.length === 0) {
      await prisma.snapshot.delete({
        where: {
          id: req.params.id,
        },
      });
      res.sendStatus(200);
    } else {
      next(createError.Conflict('Cannot delete snapshot with non-zero participant enrolls and disenrolls'));
    }
  }),
);

module.exports = router;
