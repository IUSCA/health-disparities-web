/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
// const { query } = require('express-validator');
// const _ = require('lodash/fp');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
// const { validate } = require('@/middleware/validators');
// const { accessControl } = require('@/middleware/auth');

const router = express.Router();
// const isPermittedTo = accessControl('cohorts');

router.get('/', asyncHandler(async (req, res) => {
  // #swagger.operationId = 'interventions'
  // #swagger.tags = ['hdw', 'interventions']
  // #swagger.summary = 'Get interventions'
  // #swagger.description = 'Returns a list of all interventions'

  const interventions = await prisma.intervention.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  res.json(interventions);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  // #swagger.operationId = 'interventionById'
  // #swagger.tags = ['hdw', 'interventions']
  // #swagger.summary = 'Get intervention by ID'
  // #swagger.description = 'Returns a single intervention by its ID'
  const { id } = req.params;
  const intervention = await prisma.intervention.findUniqueOrThrow({
    where: { id: parseInt(id, 10) },
  });
  res.json(intervention);
}));

router.post('/', asyncHandler(async (req, res) => {
  // #swagger.operationId = 'createIntervention'
  // #swagger.tags = ['hdw', 'interventions']
  // #swagger.summary = 'Create a new intervention'
  // #swagger.description = 'Creates a new intervention with the provided data'
  const { name, description } = req.body;
  const newIntervention = await prisma.intervention.create({
    data: {
      name,
      description,
    },
  });
  res.status(201).json(newIntervention);
}));

module.exports = router;
