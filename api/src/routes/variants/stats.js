const express = require('express');
const { PrismaClient } = require('@prisma/client');
const NodeCache = require('node-cache');
const asyncHandler = require('../../middleware/asyncHandler');
const { accessControl } = require('../../middleware/auth');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();
const cache = new NodeCache();

router.get(
  '/total_count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['variants statistics']
    // #swagger.summary = 'Get total number of variants'

    if (cache.get('variants.stats.total_count')) {
      return res.json({ count: cache.get('variants_count') });
    }
    // expensive query
    const row = await prisma.$queryRaw`select count(*) as count from variant`;
    cache.set('variants.stats.total_count', row[0].count);

    // cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json({ count: row[0].count });
  }),
);

router.get(
  '/participants/count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['variants statistics']
    // #swagger.summary = 'Get total number of participants with variant data'

    if (cache.get('variants.stats.participants_count')) {
      return res.json({ count: cache.get('variants.stats.participants_count') });
    }

    const row = await prisma.$queryRaw`select count(*) as count from participant where genotype_idx is not null`;
    cache.set('variants.stats.participants_count', row[0].count);

    // cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json({ count: row[0].count });
  }),
);

module.exports = router;
