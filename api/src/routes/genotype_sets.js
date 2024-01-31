const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param } = require('express-validator');
const _ = require('lodash/fp');

const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');

const isPermittedTo = accessControl('genotype_set');
const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['genotype_files']
    const sets = await prisma.genotype_set.findMany({});
    res.json(sets);
  }),
);

router.put(
  '/:source_id/:snapshot_id/:name',
  isPermittedTo('create'),
  validate([
    body('path').exists(),
    param('snapshot_id').isInt().toInt(),
    param('source_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['genotype_files']
    const data = _.flow([
      _.pick(['path', 'description']),
      _.omitBy(_.isNil),
    ])(req.body);
    data.name = req.params.name;
    data.snapshot_id = req.params.snapshot_id;
    data.source_id = req.params.source_id;

    const f = await prisma.genotype_set.upsert({
      where: {
        name_snapshot_id_source_id: {
          name: data.name,
          snapshot_id: data.snapshot_id,
          source_id: data.source_id,
        },
      },
      create: data,
      update: data,
    });
    res.json(f);
  }),
);

module.exports = router;
