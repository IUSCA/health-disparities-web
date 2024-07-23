const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body } = require('express-validator');

// const config = require('config');
const { validate } = require('../../middleware/validators');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');
const { validateProtocols } = require('../../middleware/variants');
const genotypeService = require('../../services/cohorts/genotype');
const genotypeModel = require('../../services/cohorts/genotype/model');
const { transformRanges } = require('../../services/cohorts/genotype/ranges');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

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
      source_id, snapshot_id, ranges, filters, zygosities,
    } = req.body.query;

    const resolvedRanges = await transformRanges(ranges, 'hg38');

    const base_query = {
      source_id,
      snapshot_id,
      protocol_id: req.user.protocol_id,
      ranges: resolvedRanges,
    };

    const sql = genotypeService.searchGenotypeDataSQL({
      base_query,
      json_query: filters,
      limit: req.body.limit,
      offset: req.body.offset,
    });
    // console.log(sql.sql, sql.values);

    const results = await prisma.$queryRaw(sql) ?? [];

    let count = 0;
    if (results.length !== 0) {
      const variants_sql = genotypeService.searchVariantIDsSQL({
        base_query,
        filters,
      });
      // console.time('participantsWithVariants')
      const count_sql = await genotypeService.participantsWithVariantsSQL({
        variants_sql,
        zygosities,
        snapshot_id,
        username: req.user.username,
        count: true,
      });
      const rows = await prisma.$queryRaw(count_sql);
      count = rows[0].count;
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
          chr: genotypeModel.decode_chromosome(chr),
        };
      }),
    });
  }),
);

module.exports = router;
