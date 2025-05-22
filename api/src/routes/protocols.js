const express = require('express');
const { param, body, query } = require('express-validator');
const _ = require('lodash/fp');

const prisma = require('@/db');
const { validate } = require('@/middleware/validators');
const asyncHandler = require('@/middleware/asyncHandler');
const { accessControl } = require('@/middleware/auth');
const utils = require('@/utils');

const isPermittedTo = accessControl('protocol');
const router = express.Router();

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
  validate([
    param('id').isInt().toInt(),
    query('participants').default(false).isBoolean().toBoolean(),
  ]),
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
        participants: req.query.participants ? {
          include: {
            participant: true,
          },
        } : true,
        author: true,
      },
    });
    protocol.users = protocol.users.map(({ user, created_at }) => ({ ...user, assigned_at: created_at }));
    if (req.query.participants) {
      protocol.participants = protocol.participants.map(
        ({ participant, created_at }) => ({ ...participant, assigned_at: created_at }),
      );
    } else {
      protocol.num_participants = protocol.participants.length;
      delete protocol.participants;
    }
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

router.put(
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

router.post(
  '/:protocol_id/users/',
  isPermittedTo('update'),
  validate([
    param('protocol_id').isInt().toInt(),
    body('user_ids').isArray({ min: 1 }).custom(utils.isIntegerArray),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['protocols']
    const { protocol_id } = req.params;
    const { user_ids } = req.body;
    await prisma.user_protocol.createMany({
      data: user_ids.map((user_id) => ({
        protocol_id,
        user_id,
      })),
      skipDuplicates: true,
    });
    res.status(201).send();
  }),
);

router.delete(
  '/:protocol_id/users/:user_id',
  isPermittedTo('delete'),
  validate([
    param('protocol_id').isInt().toInt(),
    param('user_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['protocols']
    const { protocol_id, user_id } = req.params;
    await prisma.user_protocol.delete({
      where: {
        user_id_protocol_id: {
          protocol_id,
          user_id,
        },
      },
    });
    res.status(204).send();
  }),
);

module.exports = router;
