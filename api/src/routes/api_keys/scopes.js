const express = require('express');
const { param, body } = require('express-validator');
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
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['API Keys']
    const scopes = await prisma.scope.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
    res.json(scopes);
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
