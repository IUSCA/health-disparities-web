const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, query } = require('express-validator');
const _ = require('lodash/fp');
// const createError = require('http-errors');
// const config = require('config');
const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const {
  encode_chromosome, isValidNucleotide, validateQuery, sanitizeQuery,
} = require('../services/variants/validation');
const { buildSQL, annotationHistogramSQL, buildBaseQuerySQL } = require('../services/variants');
const fields = require('../services/variants/fields');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

const annotation_validators = [
  query('source_id').isInt({ min: 1 }).toInt(),
  query('snapshot_id').isInt({ min: 1 }).toInt(),
  query('chr').customSanitizer(encode_chromosome),
  query('start').isInt({ min: 1 }).toInt(),
  query('end').isInt({ min: 1 }).toInt(),
  query('ref').custom(isValidNucleotide).toUpperCase().optional(),
  query('alt').custom(isValidNucleotide).toUpperCase().optional(),
];

function buildFilterQuery(_query) {
  // console.log(_query);
  const { start } = _query;
  const end = _query.end || start;

  return _.omitBy(_.isNil)({
    source_id: _query.source_id,
    snapshot_id: _query.snapshot_id,
    chr: _query.chr,
    ref: _query.ref,
    alt: _query.alt,

    position: start || end ? {
      gte: start,
      lte: end,
    } : null,
  });
}

function validateProtocols(req, res, next) {
  const protocol_ids = req.user.protocol_ids || [];
  if (protocol_ids.length === 0) {
    return res.status(403).json({ message: 'No protocols assigned to user' });
  }
  if (protocol_ids.length > 1) {
    return res.status(501).send('Support for multiple protocols per user is not available');
  }
  // eslint-disable-next-line prefer-destructuring
  req.user.protocol_id = protocol_ids[0];
  next();
}

router.get(
  '/annotations/:field/unique',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    param('field').isIn(fields.ANNOTATION_FIELDS),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get unique values for an annotation field'

    // The annotation table is huge and it is only useful to show values that
    // are in the current search scope of the variants.
    // or precompute unique values for each annotation field - treat as a static resource

    const { field } = req.params;
    const where = buildFilterQuery(req.query);
    where.protocol_id = req.user.protocol_id;
    where[field] = { not: null };

    const _rows = await prisma.gt_stats_annotations.groupBy({
      where,
      by: [field],
      _count: {
        [field]: true,
      },
      orderBy: {
        _count: {
          [field]: 'desc',
        },
      },
    });
    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = item._count[field];
      return acc;
    }, {});

    return res.json(distinctValuesWithCounts);
  }),
);

router.get(
  '/annotations/:field/histogram',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    param('field').isIn(fields.NUMERIC_FIELDS),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get histogram for an annotation field'

    // create histogram of field for the current search scope
    // TODO: static resource: histogram of field for the entire dataset

    const column = req.params.field;
    const num_bins = req.query.bins;
    const base_query = buildFilterQuery(req.query);
    base_query.protocol_id = req.user.protocol_id;

    const querySql = buildBaseQuerySQL(base_query);
    const sql = annotationHistogramSQL(querySql, column, num_bins);

    const histogram = await prisma.$queryRaw(sql);
    return res.json(histogram);
  }),
);

router.get(
  '/total-count',
  isPermittedTo('read'),
  validate(annotation_validators),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get total count of variants'

    const where = buildFilterQuery(req.query);
    where.protocol_id = req.user.protocol_id;
    const count = await prisma.gt_stats_annotations.count({
      where,
    });
    return res.json({ count });

    // TODO: cache the total count
  }),
);

function decode_chromosome(encoded) {
  const mapping = {
    23: 'X',
    24: 'Y',
  };
  return `${mapping[encoded] || encoded}`;
}

router.post(
  '/search',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    query('limit').default(100).isInt({ min: 1, max: 1000 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    body('query').custom(validateQuery).bail().customSanitizer(sanitizeQuery),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Search for variants'

    const base_query = buildFilterQuery(req.query);
    base_query.protocol_id = req.user.protocol_id;

    const sql = buildSQL({
      base_query,
      json_query: req.body.query,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    // console.log(sql.sql, sql.values);
    const results = await prisma.$queryRaw(sql) ?? [];

    res.json({
      metadata: { count: Number(results[0]?.total_count ?? 0) },
      results: results.map((result) => {
        // eslint-disable-next-line no-unused-vars
        const { chr, total_count, ...rest } = result;
        return {
          ...rest,
          chr: decode_chromosome(chr),
        };
      }),
    });
  }),
);

module.exports = router;
