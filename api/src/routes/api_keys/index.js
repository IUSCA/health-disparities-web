const express = require('express');
const { query, body, param } = require('express-validator');
const createError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const config = require('config');

// const logger = require('../services/logger');
const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');
const { setDifference, isValidIPOrSubnet } = require('../../utils');
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

// get all API keys
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

    if (req.query.key != null) {
      where.key = req.query.key;
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
        whitelist_subnets: {
          select: {
            subnet: true,
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

// get all API keys for a user
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
    const where = {
      user: { username: req.params.username },
      revoked: false,
    };
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

// create a new API key
router.post(
  '/:username',
  isPermittedTo('create', { checkOwnerShip: true }),
  validate([
    body('scopes').isArray().isLength({ min: 1 }),
    body('name').isString().trim().isLength({ min: 1 }),
    body('validity_days').isInt({ min: 0, max: config.get('api_keys.max_valid_days') }).toInt(),
    body('whitelisted_subnets').default([]).isArray(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Users']

    // validate that all whitelisted subnets are valid
    const subnets = req.body.whitelisted_subnets;
    const sn_results = await Promise.all(
      subnets.map(async (subnet) => [await isValidIPOrSubnet(subnet), subnet]),
    );
    // throw error if any of the subnets is invalid, with offending subnet in the error message
    sn_results.forEach(([result, subnet]) => {
      if (!result) {
        return next(createError(400, `Invalid subnet: ${subnet}`));
      }
    });

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
    // // find number of non-revoked and non-expired keys for the user
    const numKeys = await prisma.api_key.count({
      where: {
        user: { username: req.params.username },
        revoked: false,
        expires_at: { gte: new Date() },
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
      whitelisted_subnets: subnets,
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

    // ensure that the key exists and is associated with the user
    const apiKey = await prisma.api_key.findFirstOrThrow({
      where: {
        key: req.params.key,
        user: { username: req.params.username },
      },
    });

    // if the key is already revoked, return 204
    if (apiKey.revoked) {
      return res.status(204).send();
    }

    // revoke the API key
    await prisma.api_key.update({
      where: {
        key: req.params.key,
        user: { username: req.params.username },
      },
      data: {
        revoked: true,
        revoked_at: new Date(),
        revoker_username: req.user.username,
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

// associate subnet with an API key
router.put(
  '/:key/subnets/:subnet',
  isPermittedTo('create'), // TODO: only admin should be able to do this
  validate([
    param('subnet').custom(isValidIPOrSubnet),
  ]),
  asyncHandler(async (req, res, next) => {
    const api_key = await prisma.api_key.findUniqueOrThrow({
      where: {
        key: req.params.key,
      },
    });
    await prisma.subnet.upsert({
      where: {
        subnet_api_key_id: {
          api_key_id: api_key.id,
          subnet: req.params.subnet,
        },
      },
      create: {
        api_key_id: api_key.id,
        subnet: req.params.subnet,
      },
      update: {
        api_key_id: api_key.id,
        subnet: req.params.subnet,
      },
    });
    res.status(201).send();
  }),
);

router.delete(
  '/:key/subnets/:subnet',
  isPermittedTo('delete'), // TODO: only admin should be able to do this
  asyncHandler(async (req, res, next) => {
    const api_key = await prisma.api_key.findUniqueOrThrow({
      where: {
        key: req.params.key,
      },
    });
    await prisma.subnet.delete({
      where: {
        subnet_api_key_id: {
          api_key_id: api_key.id,
          subnet: req.params.subnet,
        },
      },
    });
    res.status(204).send();
  }),
);

module.exports = router;
