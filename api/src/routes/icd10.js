const express = require('express');
const { Prisma, PrismaClient } = require('@prisma/client');
const { query } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
// const { accessControl } = require('../middleware/auth');
const { validate } = require('../middleware/validators');

// const isPermittedTo = accessControl('cohort');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/starts-with/:keyword', asyncHandler(async (req, res) => {
  // #swagger.tags = ['icd10']
  // #swagger.summary = 'Get ICD10 codes starting with the keyword.'
  const { keyword } = req.params;
  const maxResults = 5;
  const sql = Prisma.sql`
    SELECT code, name
    FROM icd10_code
    WHERE code ILIKE ${`${keyword}%`} or name ILIKE ${`${keyword}%`}
    ORDER BY code
    LIMIT ${maxResults}
  `;
  const icd10 = await prisma.icd10.$queryRaw(sql);
  res.json(icd10);
}));

router.get(
  '/',
  validate([
    query('limit').isInt({ min: 1, max: 100 }).toInt().default(20),
    query('offset').isInt({ min: 0 }).toInt().default(0),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['icd10']
  // #swagger.summary = 'Search ICD10 codes by code or keyword.'
    const { keyword } = req.query;
    const sql = Prisma.sql`
    SELECT code, name
    FROM icd10_code
    WHERE code ILIKE ${`${keyword}%`} or name ILIKE ${`%${keyword}%`}
    ORDER BY code
    LIMIT ${req.query.limit} OFFSET ${req.query.offset}
  `;
    const icd10 = await prisma.icd10.$queryRaw(sql);
    res.json(icd10);
  }),
);

// function descendants(id) {
//   return Prisma.sql`
//     SELECT DISTINCT descendant_id
//     FROM icd10_hierarchy
//     WHERE ancestor_id = ${id}
//   `;
// }

// function ancestors(id) {
//   return Prisma.sql`
//     SELECT DISTINCT ancestor_id
//     FROM icd10_hierarchy
//     WHERE descendant_id = ${id}
//   `;
// }

// function children(id) {
//   return Prisma.sql`
//     SELECT descendant_id
//     FROM icd10_hierarchy
//     WHERE ancestor_id = ${id} AND level = 1
//   `;
// }

// function parent(id) {
//   return Prisma.sql`
//     SELECT ancestor_id
//     FROM icd10_hierarchy
//     WHERE descendant_id = ${id} AND level = 1
//   `;
// }

module.exports = router;
