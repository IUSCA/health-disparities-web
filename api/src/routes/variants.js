const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param } = require('express-validator');
const _ = require('lodash/fp');
const createError = require('http-errors');
// const config = require('config');
const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const {
  validateQuery, sanitizeQuery,
  validateRanges, sanitizeRanges,
} = require('../services/variants/validation');
const {
  buildSQL, annotationHistogramSQL, buildBaseQuerySQL,
  participantsWithVariants,
  buildRangesPrismaQuery, buildSQLVarIds,
} = require('../services/variants');
const fields = require('../services/variants/fields');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

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

router.post(
  '/annotations/:field/unique',
  isPermittedTo('read'),
  validate([
    body('source_id').isInt({ min: 1 }).toInt(),
    body('snapshot_id').isInt({ min: 1 }).toInt(),
    param('field').isIn(fields.ANNOTATION_FIELDS),
    body('ranges').custom(validateRanges).bail().customSanitizer(sanitizeRanges),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get unique values for an annotation field'

    // The annotation table is huge and it is only useful to show values that
    // are in the current search scope of the variants.
    // or precompute unique values for each annotation field - treat as a static resource

    const { field } = req.params;

    const where = {
      source_id: req.body.source_id,
      snapshot_id: req.body.snapshot_id,
      protocol_id: req.user.protocol_id,
      [field]: { not: null },
      ...buildRangesPrismaQuery(req.body.ranges),
    };

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

router.post(
  '/annotations/:field/histogram',
  isPermittedTo('read'),
  validate([
    param('field').isIn(fields.NUMERIC_FIELDS),
    body('bins').default(10).isInt({ min: 1, max: 100 }),
    body('source_id').isInt({ min: 1 }).toInt(),
    body('snapshot_id').isInt({ min: 1 }).toInt(),
    body('ranges').custom(validateRanges).bail().customSanitizer(sanitizeRanges),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get histogram for an annotation field'

    // create histogram of field for the current search scope
    // TODO: static resource: histogram of field for the entire dataset

    const column = req.params.field;
    const num_bins = req.body.bins;

    const querySql = buildBaseQuerySQL({
      source_id: req.body.source_id,
      snapshot_id: req.body.snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges: req.body.ranges,
    });

    const sql = annotationHistogramSQL(querySql, column, num_bins);
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
    body('ranges').custom(validateRanges).bail().customSanitizer(sanitizeRanges),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Get total count of variants'

    const where = {
      source_id: req.body.source_id,
      snapshot_id: req.body.snapshot_id,
      protocol_id: req.user.protocol_id,
      ...buildRangesPrismaQuery(req.body.ranges),
    };
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
    body('limit').default(100).isInt({ min: 1, max: 1000 }).toInt(),
    body('offset').default(0).isInt({ min: 0 }).toInt(),
    body('query').custom(validateQuery).bail()
      .customSanitizer(sanitizeQuery),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Search for variants'

    const {
      source_id, snapshot_id, ranges, criteria, zygosities,
    } = req.body.query;

    const base_query = {
      source_id,
      snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges,
    };

    const sql = buildSQL({
      base_query,
      json_query: criteria,
      limit: req.body.limit,
      offset: req.body.offset,
    });
    // console.log(sql.sql, sql.values);
    // console.time('variant query');
    const results = await prisma.$queryRaw(sql) ?? [];
    // console.timeEnd('variant query')

    let count = 0;
    if (results.length !== 0) {
      const variants_sql = buildSQLVarIds({
        base_query,
        json_query: criteria,
      });
      // console.time('participantsWithVariants')
      count = await participantsWithVariants({
        variants_sql,
        zygosities,
        snapshot_id,
        username: req.user.username,
        return_count: true,
      });
      // console.timeEnd('participantsWithVariants')
    }

    res.json({
      metadata: {
        variant_count: Number(results[0]?.total_count ?? 0),
        participant_count: parseInt(count, 10),
      },
      variants: results.map((result) => {
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

router.post(
  '/cohort',
  accessControl('cohort')('create'),
  validate([
    body('query').custom(validateQuery).bail().customSanitizer(sanitizeQuery),
    body('name').isString().notEmpty(),
    body('is_published').optional().isBoolean(),
    body('is_locked').optional().isBoolean(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Search for variants'

    const {
      source_id, snapshot_id, ranges, criteria, zygosities,
    } = req.body.query;

    const base_query = {
      source_id,
      snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges,
    };

    const variants_sql = buildSQLVarIds({
      base_query,
      json_query: criteria,
    });
    const participants = await participantsWithVariants({
      variants_sql,
      zygosities,
      snapshot_id,
      username: req.user.username,
      return_count: false,
    });

    if (participants.length === 0) {
      return createError(400, 'No participants found for the given query.');
    }

    const cohort_data = _.flow([
      _.pick(['name', 'is_published', 'is_locked', 'description', 'metadata']),
      _.omitBy(_.isNil),
    ])(req.body);
    cohort_data.query = req.body.query;
    cohort_data.metadata = {
      ...cohort_data.metadata,
      protocol_id: req.user.protocol_id,
    };

    const cohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        author_username: req.user.username,
        participants,
      },
      select: {
        id: true,
      },
    });
    res.json(cohort);
  }),
);

router.patch(
  '/cohort/:id',
  accessControl('cohort')('update'),
  validate([
    param('id').isUUID(),
    body('query').custom(validateQuery).bail().customSanitizer(sanitizeQuery),
    body('name').optional().isString().notEmpty(),
    body('is_published').optional().isBoolean(),
    body('is_locked').optional().isBoolean(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    const cohortToUpdate = await prisma.cohort.findUniqueOrThrow({
      where: {
        id: req.params.id,
      },
    });

    const {
      source_id, snapshot_id, ranges, criteria, zygosities,
    } = req.body.query;

    const base_query = {
      source_id,
      snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges,
    };

    const variants_sql = buildSQLVarIds({
      base_query,
      json_query: criteria,
    });
    const participants = await participantsWithVariants({
      variants_sql,
      zygosities,
      snapshot_id,
      username: req.user.username,
      return_count: false,
    });
    // console.log('participants.length', participants.length);

    const cohort_data = _.pick(['name', 'is_published', 'is_locked', 'description', 'metadata'])(req.body);

    cohort_data.metadata = _.merge(cohortToUpdate.metadata, {
      protocol_id: req.user.protocol_id,
    });

    cohort_data.query = req.body.query;

    const cohort = await prisma.cohort.update({
      where: {
        id: req.params.id,
      },
      data: {
        ...cohort_data,
        author_username: req.user.username,
        participants,
      },
      select: {
        id: true,
      },
    });
    res.json(cohort);
  }),
);

module.exports = router;
