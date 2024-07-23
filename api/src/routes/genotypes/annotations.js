const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param } = require('express-validator');

const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');
const { validateProtocols } = require('../../middleware/variants');
const fields = require('../../services/cohorts/genotype/fields');
const genotypeService = require('../../services/cohorts/genotype');
const genotypeModel = require('../../services/cohorts/genotype/model');
const { transformRanges } = require('../../services/cohorts/genotype/ranges');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

router.post(
  '/annotations/:field/unique',
  isPermittedTo('read'),
  validate([
    body('source_id').isInt({ min: 1 }).toInt(),
    body('snapshot_id').isInt({ min: 1 }).toInt(),
    param('field').isIn(fields.ANNOTATION_FIELDS),
    body('ranges')
      .custom(genotypeModel.validateRanges)
      .bail()
      .customSanitizer(genotypeModel.sanitizeRanges),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get unique values for an annotation field'

    // The annotation table is huge and it is only useful to show values that
    // are in the current search scope of the variants.
    // or precompute unique values for each annotation field - treat as a static resource

    const { field } = req.params;
    const resolvedRanges = await transformRanges(req.body.ranges, 'hg38');
    const sql = genotypeService.distinctAnnotationsQuery(field, {
      source_id: req.body.source_id,
      snapshot_id: req.body.snapshot_id,
      ranges: resolvedRanges,
      protocol_id: req.user.protocol_id,
    });
    const rows = await prisma.$queryRaw(sql);
    const distinctValuesWithCounts = rows.reduce((acc, row) => {
      acc[row.value] = row.count;
      return acc;
    });
    res.json(distinctValuesWithCounts);
  }),
);

router.post(
  '/annotations/:field/histogram',
  isPermittedTo('read'),
  validate([
    param('field').isIn(fields.NUMERIC_FIELDS),
    body('bins').default(10).isInt({ min: 1, max: 100 }),
    body('source_id').isInt({ min: 1 }).toInt(),
    body('snapshot_id').isInt({ min: 1 }).toInt(),
    body('ranges')
      .custom(genotypeModel.validateRanges)
      .bail()
      .customSanitizer(genotypeModel.sanitizeRanges),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get histogram for an annotation field'

    // create histogram of field for the current search scope
    // TODO: static resource: histogram of field for the entire dataset

    const column = req.params.field;
    const num_bins = req.body.bins;

    const resolvedRanges = await transformRanges(req.body.ranges, 'hg38');
    const querySql = genotypeService.buildBaseQuerySQL({
      source_id: req.body.source_id,
      snapshot_id: req.body.snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges: resolvedRanges,
    });

    const sql = genotypeService.annotationHistogramSQL(querySql, column, num_bins);
    // console.log(sql.sql, sql.values);

    const histogram = await prisma.$queryRaw(sql);
    return res.json(histogram);
  }),
);

router.post(
  '/total-count',
  isPermittedTo('read'),
  validate([
    body('source_id').isInt({ min: 1 }).toInt(),
    body('snapshot_id').isInt({ min: 1 }).toInt(),
    body('ranges')
      .custom(genotypeModel.validateRanges)
      .bail()
      .customSanitizer(genotypeModel.sanitizeRanges),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get total count of variants'

    const {
      source_id, snapshot_id, ranges,
    } = req.body;

    const resolvedRanges = await transformRanges(ranges, 'hg38');// TODO

    const sql = genotypeService.buildTotalCountSQL({
      source_id,
      snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges: resolvedRanges,
    });
    // console.log(sql.sql, sql.values);
    const rows = await prisma.$queryRaw(sql);
    return res.json({ count: rows[0].count });
  }),
);

module.exports = router;
