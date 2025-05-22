const express = require('express');
const { body, query } = require('express-validator');
const _ = require('lodash/fp');

const { validate } = require('@/middleware/validators');
const asyncHandler = require('@/middleware/asyncHandler');
const { accessControl } = require('@/middleware/auth');
const prisma = require('@/db');

const isPermittedTo = accessControl('genotype_file');
const router = express.Router();

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('snapshot_id').isInt().toInt().optional(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Genotype Files']
    const rows = await prisma.genotype_file.findMany({
      where: {
        snapshot_id: req.params.snapshot_id,
      },
    });
    res.json(rows);
  }),
);

router.put(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').exists(),
    body('path').exists(),
    body('md5').exists(),
    body('size').notEmpty().customSanitizer(BigInt),
    body('snapshot_id').isInt().toInt(),
    body('source_id').isInt().toInt(),
    body('chr').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Genotype Files']
    const data = _.flow([
      _.pick(['name', 'path', 'md5', 'size', 'snapshot_id', 'source_id', 'chr', 'metadata', 'description']),
      _.omitBy(_.isNil),
    ])(req.body);
    const f = await prisma.genotype_file.upsert({
      where: {
        name: data.name,
        snapshot_id: data.snapshot_id,
        source_id: data.source_id,
      },
      create: data,
      update: data,
    });
    res.json(f);
  }),
);

module.exports = router;
