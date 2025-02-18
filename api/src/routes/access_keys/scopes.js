const express = require('express');
const { param, body, query } = require('express-validator');
// const createError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
// const config = require('config');

// const logger = require('../services/logger');
const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');

const prisma = new PrismaClient();
const isPermittedTo = accessControl('scopes');
const router = express.Router();

// Create a new scope
router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('resource').isString().notEmpty(),
    body('action').isString().notEmpty(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']
    const scope = await prisma.scope.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        resource: req.body.resource,
        action: req.body.action,
      },
    });
    res.status(201).json(scope);
  }),
);

// Get all scopes
router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('limit').default(50).isInt({ min: 1 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']
    const where = {};
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
        { resource: { contains: req.query.search, mode: 'insensitive' } },
        { action: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [scopes, total] = await prisma.$transaction([
      prisma.scope.findMany({
        where,
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' },
        ],
        skip: req.query.offset,
        take: req.query.limit,
      }),
      prisma.scope.count({ where }),
    ]);

    res.json({
      data: scopes,
      metadata: {
        total,
        limit: req.query.limit,
        offset: req.query.offset,
      },
    });
  }),
);

// Delete a scope by ID
router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']
    await prisma.scope.delete({
      where: { id: req.params.id },
    });
    res.status(204).end();
  }),
);

module.exports = router;
