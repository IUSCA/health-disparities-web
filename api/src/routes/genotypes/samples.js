const express = require('express');
const { PrismaClient } = require('@prisma/client');
// const { body, query } = require('express-validator');
// const _ = require('lodash/fp');

// const { validate } = require('../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');

const isPermittedTo = accessControl('genotype_sample');
const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/distinct/participant_id',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['genotype_samples']
    const distinctRows = await prisma.genotype_sample.groupBy({
      by: ['sample', 'participant_id'],
      select: {
        sample: true,
        participant_id: true,
      },
    });
    res.json(distinctRows);
  }),
);

router.put(
  '/',
  isPermittedTo('create'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['genotype_samples']
    const result = await prisma.genotype_sample.createMany({
      data: req.body,
      skipDuplicates: true,
    });
    res.json(result);
  }),
);

module.exports = router;
