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
    v = {
      total: parseInt(row[0].count, 10),
      participants: parseInt(row2[0].count, 10),
    };
    cache.set(CACHE_KEY, v);

    // cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(v);
  }),
);

router.get(
  '/genes/count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['variants statistics']
    // #swagger.summary = 'Get total number of genes'

    const CACHE_KEY = 'variants.stats.genes.count';
    let v = cache.get(CACHE_KEY);
    if (v) {
      return res.json(v);
    }

    const row = await prisma.$queryRaw`select count(*) as count from gene`;
    v = { count: parseInt(row[0].count, 10) };
    cache.set(CACHE_KEY, v);

    // cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(v);
  }),
);

router.get(
  '/clinvar/count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['variants statistics']
    // #swagger.summary = 'Get total number of clinvar annotations'

    const CACHE_KEY = 'variants.stats.clinvar.count';
    let v = cache.get(CACHE_KEY);
    if (v) {
      return res.json(v);
    }

    const row = await prisma.$queryRaw`
      select count(*) as count from annotation a where cln_allele_id is not null
    `;
    v = { count: parseInt(row[0].count, 10) };
    cache.set(CACHE_KEY, v);

    // cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(v);
  }),
);

router.get(
  '/gnomad/count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['variants statistics']
    // #swagger.summary = 'Get total number of clinvar gnoma annotations'

    const CACHE_KEY = 'variants.stats.gnomad.count';
    let v = cache.get(CACHE_KEY);
    if (v) {
      return res.json(v);
    }

    const row = await prisma.$queryRaw`
      select count(*) as count from annotation a where cadd_phred is not null;
    `;
    v = { count: parseInt(row[0].count, 10) };
    cache.set(CACHE_KEY, v);

    // cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(v);
  }),
);

module.exports = router;
