const express = require('express');
const { query } = require('express-validator');
// const createError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
// const config = require('config');

// const logger = require('../services/logger');
const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');
const apiKeyService = require('../../services/api_key');

const prisma = new PrismaClient();
const isPermittedTo = accessControl('api_keys_audit_logs');
const router = express.Router();

// get all audit logs
// filter by api key, api key user, scope name, scope action, scope resource, accessed_at date range
// endpoint, http method, status code, response time range
router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('limit').default(50).isInt({ min: 1, max: 100 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    query('status_code').isInt().toInt().optional(),
    query('response_time_start').isInt().toInt().optional(),
    query('response_time_end').isInt().toInt().optional(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']

    const where = {};

    if (req.query.api_key) {
      where.api_key = { key: req.query.api_key };
    }

    if (req.query.username) {
      where.api_key = { user: { username: req.query.username } };
    }

    if (req.query.scope_name) {
      where.scope = { name: req.query.scope_name };
    }

    if (req.query.scope_action) {
      where.scope = { action: req.query.scope_action };
    }

    if (req.query.scope_resource) {
      where.scope = { resource: req.query.scope_resource };
    }

    if (req.query.accessed_at_start && req.query.accessed_at_end) {
      where.accessed_at = {
        gte: new Date(req.query.accessed_at_start),
        lte: new Date(req.query.accessed_at_end),
      };
    }

    if (req.query.endpoint) {
      where.endpoint = {
        contains: req.query.endpoint,
        mode: 'insensitive', // case-insensitive search
      };
    }

    if (req.query.http_method) {
      where.http_method = req.query.http_method;
    }

    if (req.query.status_code) {
      where.status_code = req.query.status_code;
    }

    if (req.query.response_time_start && req.query.response_time_end) {
      where.response_time = {
        gte: req.query.response_time_start,
        lte: req.query.response_time_end,
      };
    }

    const dataQuery = {
      where,
      include: { api_key: true, scope: true },
      take: req.query.limit,
      skip: req.query.offset,
    };

    const [audit_logs, count] = await prisma.$transaction([
      prisma.api_audit_log.findMany(dataQuery),
      prisma.api_audit_log.count({ where }),
    ]);

    res.json({
      metadata: {
        count,
        limit: req.query.limit,
        offset: req.query.offset,
      },
      data: audit_logs.map((log) => ({
        ...log,
        api_key: apiKeyService.sanitizeApiKey(log.api_key),
      })),
    });
  }),
);

module.exports = router;
