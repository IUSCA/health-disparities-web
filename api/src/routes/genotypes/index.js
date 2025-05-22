const express = require('express');
const { body } = require('express-validator');
const config = require('config');

const prisma = require('@/db');
const { validate } = require('@/middleware/validators');
const asyncHandler = require('@/middleware/asyncHandler');
const { accessControl } = require('@/middleware/auth');
const { validateProtocols } = require('@/middleware/variants');
const genotypeService = require('@/services/cohorts/genotype');
const genotypeModel = require('@/services/cohorts/genotype/model');
const { transformRanges } = require('@/services/cohorts/genotype/ranges');

const isPermittedTo = accessControl('variant');
const router = express.Router();

router.use('/stats', require('./stats'));
router.use('/annotations', require('./annotations'));
router.use('/sets', require('./sets'));
router.use('/files', require('./files'));
router.use('/samples', require('./samples'));

router.post(
  '/search',
  isPermittedTo('read'),
  validate([
    body('limit').default(100).isInt({ min: 1, max: 1000 }).toInt(),
    body('offset').default(0).isInt({ min: 0 }).toInt(),
    body('query')
      .custom(genotypeModel.validate)
      .bail()
      .customSanitizer(genotypeModel.sanitize),
  ]),
  validateProtocols,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['variants']
    // #swagger.summary = 'Search for variants given a genotype cohort query body'

    const {
      source_id, snapshot_id, ranges, filters,
    } = req.body.query;

    const resolvedRanges = await transformRanges(ranges, config.get('variant_search.genome_build'));

    const base_query = {
      source_id,
      snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges: resolvedRanges,
    };

    const sql = genotypeService.searchGenotypeDataSQL({
      base_query,
      filters,
      limit: req.body.limit,
      offset: req.body.offset,
    });
    // console.log(sql.sql, sql.values);

    const results = await prisma.$queryRaw(sql) ?? [];

    res.json({
      metadata: {
        total_count: Number(results[0]?.total_count ?? 0),
      },
      variants: results.map((result) => {
        // eslint-disable-next-line no-unused-vars
        const { chr, total_count, ...rest } = result;
        return {
          ...rest,
          chr: genotypeModel.decode_chromosome(chr),
        };
      }),
    });
  }),
);

module.exports = router;
