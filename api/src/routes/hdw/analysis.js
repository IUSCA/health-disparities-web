/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { query } = require('express-validator');
// const _ = require('lodash/fp');
const axios = require('axios');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
// const { accessControl } = require('@/middleware/auth');

const router = express.Router();
// const isPermittedTo = accessControl('cohorts');

const api = axios.create({
  baseURL: '/hdw-api',
});

router.post(
  '/logistic/:cohort_id/:intervention_id',
  asyncHandler(async (req, res) => {
  // #swagger.operationId = 'logisticRegression'
  // #swagger.tags = ['hdw', 'analysis']
  // #swagger.summary = 'Run logistic regression analysis'
  // #swagger.description = 'Runs a logistic regression analysis on the specified cohort and intervention'
  // #swagger.parameters['cohort_id'] = { description: 'The cohort id', required: true }
  // #swagger.parameters['intervention_id'] = { description: 'The intervention id', required: true }
    const { cohort_id, intervention_id } = req.params;
    const apiRes = await api.post(`/analysis/logistic/${cohort_id}/${intervention_id}`);
    res.json(apiRes.data);
  }),
);

router.get(
  '/results',
  validate([
    query('limit').default(10).isInt({ min: 1, max: 100 }),
    query('offset').default(0).isInt({ min: 0 }),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.operationId = 'getAnalysisResults'
  // #swagger.tags = ['hdw', 'analysis']
  // #swagger.summary = 'Get analysis results'
  // #swagger.description = 'Returns the results of the analysis'
    const results = await prisma.analysis_result.findMany({
      orderBy: {
        created_at: 'desc',
      },
      include: {
        cohort: true,
        intervention: true,
      },
      take: req.query.limit,
      skip: req.query.offset,
    });

    res.json(results);
  }),
);

router.get(
  '/results/:id',
  validate([
    query('id').isInt({}).toInt(),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.operationId = 'getAnalysisResultById'
  // #swagger.tags = ['hdw', 'analysis']
  // #swagger.summary = 'Get analysis result by id'
  // #swagger.description = 'Returns the analysis result by its id'
    const { id } = req.params;
    const result = await prisma.analysis_result.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        cohort: true,
        intervention: true,
      },
    });

    res.json(result);
  }),
);

module.exports = router;
