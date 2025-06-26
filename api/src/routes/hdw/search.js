/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { query } = require('express-validator');
// const _ = require('lodash/fp');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
// const { accessControl } = require('@/middleware/auth');

const router = express.Router();
// const isPermittedTo = accessControl('cohorts');

router.get(
  '/dx',
  validate([
    query('name').notEmpty(),
    query('limit').default(50).isInt({ min: 1, max: 50 }),
    query('offset').default(0).isInt({ min: 0 }),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.operationId = 'searchDx'
  // #swagger.tags = ['search']
  // #swagger.summary = 'Search for diagnoses'
  // #swagger.description = 'Searches for diagnoses by name'
  // #swagger.parameters['name'] = { description: 'Name of the diagnosis to search for' }

    const { name, limit, offset } = req.query;
    const nameLower = name.toLowerCase();
    const x = `%${nameLower}%`;
    const results = await prisma.$queryRaw`
      SELECT *
      FROM dx_search_mv
      WHERE name_search LIKE ${x}
      ORDER BY participant_count DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    res.json(results);
  }),
);

router.get(
  '/procedures',
  validate([
    query('name').notEmpty(),
    query('limit').default(50).isInt({ min: 1, max: 50 }),
    query('offset').default(0).isInt({ min: 0 }),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'searchProcedures'
    // #swagger.tags = ['search']
    // #swagger.summary = 'Search for procedures'
    // #swagger.description = 'Searches for procedures by name'
    // #swagger.parameters['name'] = { description: 'Name of the procedure to search for' }

    const { name, limit, offset } = req.query;
    const nameLower = name.toLowerCase();
    const x = `%${nameLower}%`;
    const results = await prisma.$queryRaw`
      SELECT *
      FROM procedure_search_mv
      WHERE name_search LIKE ${x}
      ORDER BY participant_count DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    res.json(results);
  }),
);

module.exports = router;
