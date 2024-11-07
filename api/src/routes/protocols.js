const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body } = require('express-validator');
const _ = require('lodash/fp');

const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const utils = require('../utils');

const isPermittedTo = accessControl('protocol');
const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['protocols']
    const _protocols = await prisma.protocol.findMany({
      include: {
        users: {
          select: {
            protocol_id: true,
          },
        },
        participants: {
          select: {
            protocol_id: true,
          },
        },
        author: true,
      },
    });
    const protocols = _protocols.map((protocol) => {
      const { users, participants, ...rest } = protocol;
      return {
        ...rest,
        users: users.length,
        participants: participants.length,
      };
    });
    res.json(protocols);
  }),
);

router.get(
  '/:id',
  isPermittedTo('read'),
  validate([param('id').isInt().toInt()]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['protocols']
    const protocol = await prisma.protocol.findFirstOrThrow({
      where: {
        id: req.params.id,
      },
      include: {
        users: {
          include: {
            user: true,
          },
        },
        participants: {
          include: {
            participant: true,
          },
        },
        author: true,
      },
    });
    res.json(protocol);
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').exists(),
    body('user_ids').optional().custom(utils.isIntegerArray),
    body('participant_ids').optional().custom(utils.isIntegerArray),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['protocols']
    const data = _.flow([
      _.pick(['name', 'description']),
      _.omitBy(_.isNil),
    ])(req.body);
    const protocol = await prisma.protocol.create({
      data: {
        ...data,
        users: {
          create: (req.body.user_ids || []).map((id) => ({ user_id: id })),
        },
        participants: {
          create: (req.body.participant_ids || []).map((id) => ({ participant_id: id })),
        },
        author_id: req.user.id,
      },
    });
    res.json(protocol);
  }),
);

router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isInt().toInt(),
    body('user_ids').optional().custom(utils.isIntegerArray),
    body('participant_ids').optional().custom(utils.isIntegerArray),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['protocols']
    const modify_user_assocs = req.body.user_ids != null;
    const modify_participant_assocs = req.body.participant_ids != null;

    const delete_user_assocs = modify_user_assocs
      ? prisma.user_protocol.deleteMany({
        where: {
          protocol_id: req.params.id,
        },
      }) : null;

    const delete_participant_assocs = modify_participant_assocs
      ? prisma.participant_protocol.deleteMany({
        where: {
          protocol_id: req.params.id,
        },
      }) : null;

    const data = _.flow([
      _.pick(['name', 'description']),
      _.omitBy(_.isNil),
    ])(req.body);
    const update = prisma.protocol.update({
      where: {
        id: req.params.id,
      },
      data: {
        ...data,
        users: {
          create: (req.body.user_ids || []).map((id) => ({ user_id: id })),
        },
        participants: {
          create: (req.body.participant_ids || []).map((id) => ({ participant_id: id })),
        },
      },
      include: {
        users: true,
        participants: true,
      },
    });

    const results = await prisma.$transaction(
      [delete_user_assocs, delete_participant_assocs, update].filter(_.negate(_.isNil)),
    );

    res.json(_.last(results));
  }),
);

// deleting a protocol deletes associations: protocol-participant and protocol-user
router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['protocols']
    await prisma.protocol.delete({
      where: {
        id: req.params.id,
      },
    });
    res.sendStatus(200);
  }),
);

module.exports = router;
