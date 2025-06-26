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
  // #swagger.operationId = 'statistics'
  // #swagger.tags = ['statistics']
  // #swagger.summary = 'Get statistics'
  // #swagger.description = 'Returns various statistics about the database'

  const rows = await prisma.$queryRaw`
    select
      (select reltuples FROM pg_class WHERE relname = 'participant') as subjects,
      (select reltuples FROM pg_class WHERE relname = 'dx' ) as diagnoses,
      (select reltuples FROM pg_class WHERE relname = 'procedure') as procedures,
      (select reltuples FROM pg_class WHERE relname = 'encounter') as encounters
  `;

  res.json(rows[0] || {
    subjects: 0,
    diagnoses: 0,
    procedures: 0,
    encounters: 0,
  });
}));

module.exports = router;
