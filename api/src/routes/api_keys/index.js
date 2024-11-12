const express = require('express');
const { query, body } = require('express-validator');
const createError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const config = require('config');

// const logger = require('../services/logger');
const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');
const { setDifference } = require('../../utils');
const apiKeyService = require('../../services/api_key');

const prisma = new PrismaClient();
const isPermittedTo = accessControl('api_keys');
const router = express.Router();

router.use('/scopes', require('./scopes'));
router.use('/audit_logs', require('./audit_logs'));

function addLastUsedAt(apiKey) {
  const { audit_logs, ...rest } = apiKey;
  const last_used_at = (audit_logs != null && audit_logs.length > 0) ? audit_logs[0].accessed_at : null;
  return {
    ...rest,
    last_used_at,
  };
}

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('limit').default(50).isInt({ min: 1, max: 100 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    query('expired').toBoolean().optional(),
    query('username').optional(),
    query('revoked').toBoolean().optional(),
    query('sort_by').default('created_at').isIn(['created_at', 'expires_at']),
    query('sort_order').default('desc').isIn(['asc', 'desc']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']
    const where = {};
    if (req.query.expired != null) {
      // expired is true - expires_at : { lt: new Date() }
      // expired is false - expires_at : { gte: new Date() }
      where.expires_at = { [req.query.expired ? 'lt' : 'gte']: new Date() };
    }

    if (req.query.revoked != null) {
      where.revoked = req.query.revoked;
    }

    if (req.query.user_id != null) {
      where.user = { username: req.query.username };
    }

    const dataQuery = {
      where,
      include: {
        user: true,
        scopes: {
          include: {
            scope: true,
          },
        },
        audit_logs: {
          take: 1,
          orderBy: {
            accessed_at: 'desc',
          },
        },
      },
      take: req.query.limit,
      skip: req.query.offset,
      orderBy: {
        [req.query.sort_by]: req.query.sort_order,
      },
    };

    const [api_keys, count] = await prisma.$transaction([
      prisma.api_key.findMany(dataQuery),
      prisma.api_key.count({ where }),
    ]);

    res.json({
      metadata: {
        total: count,
        limit: req.query.limit,
        offset: req.query.offset,
      },
      // remove secret from the response
      data: req.permission.filter(api_keys)
        .map(apiKeyService.sanitizeApiKey)
        .map(addLastUsedAt),
    });
  }),
);

router.get(
  '/:username',
  isPermittedTo('read', { checkOwnerShip: true }),
  validate([
    query('limit').default(50).isInt({ min: 1, max: 100 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    query('sort_by').default('created_at').isIn(['created_at', 'expires_at']),
    query('sort_order').default('desc').isIn(['asc', 'desc']),
  ]),
  asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['API Keys']
    const where = {};
    if (req.query.expired != null) {
    // expired is true - expires_at : { lt: new Date() }
    // expired is false - expires_at : { gte: new Date() }
      where.expires_at = { [req.query.expired ? 'lt' : 'gte']: new Date() };
    }

    const dataQuery = {
      where,
      include: {
        scopes: {
          include: {
            scope: true,
          },
        },
        audit_logs: {
          take: 1,
          orderBy: {
            accessed_at: 'desc',
          },
        },
      },
      take: req.query.limit,
      skip: req.query.offset,
      orderBy: {
        [req.query.sort_by]: req.query.sort_order,
      },
    };

    const [api_keys, count] = await prisma.$transaction([
      prisma.api_key.findMany(dataQuery),
      prisma.api_key.count({ where }),
    ]);

    res.json({
      metadata: {
        total: count,
        limit: req.query.limit,
        offset: req.query.offset,
      },
      // remove secret from the response
      data: req.permission.filter(api_keys)
        .map(apiKeyService.sanitizeApiKey)
        .map(addLastUsedAt),
    });
  }),
);

router.post(
  '/:username',
  isPermittedTo('create', { checkOwnerShip: true }),
  validate([
    body('scopes').isArray().isLength({ min: 1 }),
    body('name').isString().trim().isLength({ min: 1 }),
    body('validity_days').isInt({ min: 0, max: config.get('api_keys.max_valid_days') }).toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Users']

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + req.body.validity_days);

    // validate that user exists
    await prisma.user.findFirstOrThrow({
      where: {
        username: req.params.username,
        is_deleted: false,
      },
    });

    // validate that user does not have max number of keys
    // // find number of non-revoked keys for the user
    const numKeys = await prisma.api_key.count({
      where: {
        user: { username: req.params.username },
        revoked: false,
      },
    });
    if (numKeys >= config.get('api_keys.max_per_user')) {
      return next(createError(400, 'The maximum number of API keys has been reached'));
    }

    // validate that the scopes exist
    const allScopes = await prisma.scope.findMany({
      where: {
        name: { in: req.body.scopes },
      },
      select: {
        name: true,
      },
    });
    if (allScopes.length !== req.body.scopes.length) {
      // some scopes do not exist
      const missingScopes = [...setDifference(req.body.scopes, allScopes.map((s) => s.name))];
      return next(createError(400, `The following scopes do not exist: ${missingScopes.join(', ')}`));
    }

    // generate a new key and secret
    const apiKey = await apiKeyService.createApiKey({
      username: req.params.username,
      name: req.body.name,
      description: req.body.description,
      scopes: req.body.scopes,
      expires_at,
    });

    res.json(apiKey);
  }),
);

// to revoke an API key
router.delete(
  '/:username/:key',
  isPermittedTo('delete', { checkOwnerShip: true }),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['API Keys']

    // revoke the API key
    await prisma.api_key.update({
      where: {
        key: req.params.key,
      },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    });

    res.status(204).send();
  }),
);

// hard delete an API key
router.delete(
  '/:key',
  isPermittedTo('delete'),
  asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['API Keys']

    // delete the API key
    // also deletes the audit logs, and scope associations
    await prisma.api_key.delete({
      where: {
        key: req.params.key,
      },
    });

    res.status(204).send();
  }),
);

module.exports = router;
