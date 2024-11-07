const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, query } = require('express-validator');
const _ = require('lodash/fp');

const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');

const isPermittedTo = accessControl('phenotype_file');
const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('snapshot_id').isInt().toInt().optional(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Phenotype Files']
    const rows = await prisma.phenotype_file.findMany({
      where: {
        snapshot_id: req.params.snapshot_id,
      },
    });
    res.json(rows);
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').exists(),
    body('path').exists(),
    body('md5').exists(),
    body('size').notEmpty().customSanitizer(BigInt),
    body('snapshot_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Phenotype Files']
    const data = _.flow([
      _.pick(['name', 'path', 'md5', 'size', 'snapshot_id', 'metadata', 'description']),
      _.omitBy(_.isNil),
    ])(req.body);
    const f = await prisma.phenotype_file.create({
      data,
    });
    res.json(f);
  }),
);

module.exports = router;
