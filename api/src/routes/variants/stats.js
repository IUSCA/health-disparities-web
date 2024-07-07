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
  '/counts',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['variants statistics']
    // #swagger.summary = 'Get total number of variants'

    const CACHE_KEY = 'variants.stats.counts';
    let v = cache.get(CACHE_KEY);
    if (v) {
      return res.json(v);
    }
    // expensive query
    const row = await prisma.$queryRaw`select count(*) as count from variant`;
    const row2 = await prisma.$queryRaw`select count(*) as count from participant where genotype_idx is not null`;
    v = { total: row[0].count, participants: row2[0].count };
    cache.set(CACHE_KEY, v);

    // cache indefinitely - 1 year
    // res.set('Cache-control', 'private, max-age=31536000');
    res.json(v);
  }),
);

module.exports = router;
