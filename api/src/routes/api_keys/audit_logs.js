const express = require('express');
// const { params, body } = require('express-validator');
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
// filter by api key, api key id, api key user, scope name, scope action, scope resource, and accessed_at date range
router.get(
  '/',
  isPermittedTo('read'),
  validate([]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']

    const dataQuery = {
      include: { api_key: true },
    };

    const audit_logs = await prisma.api_audit_log.findMany(dataQuery);

    res.json(audit_logs.map((log) => ({
      ...log,
      api_key: apiKeyService.sanitizeApiKey(log.api_key),
    })));
  }),
);

module.exports = router;
