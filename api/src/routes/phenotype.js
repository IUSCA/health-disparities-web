const express = require('express');
const { Prisma, PrismaClient } = require('@prisma/client');
const NodeCache = require('node-cache');
const { query } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const { validate } = require('../middleware/validators');
const {
  histogramSQL,
} = require('../services/queries');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();
const cache = new NodeCache();

router.get(
  '/total-counts',
  isPermittedTo('read'),
  validate([
    query('category').isIn(['lab', 'dx', 'medication']),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['phenotype']
  // #swagger.summary = 'Get total number of labs, diagnosis, medications.'

    if (cache.get('phenotype.categories.counts')) {
      return res.json(cache.get('phenotype.categories.counts'));
    }
    const lab_rows = await prisma.$queryRaw`select count(distinct name) as count from lab`;
    const dx_rows = await prisma.$queryRaw`select count(*) as count from dx_unique_name`;
    const med_rows = await prisma.$queryRaw`select count(distinct name) as count from medication`;

    const v = {
      counts: {
        lab: lab_rows[0].count,
        dx: dx_rows[0].count,
        medication: med_rows[0].count,
      },
    };
    cache.set('phenotype.categories.counts', v);

    res.json(v);
  }),
);

router.get(
  '/:category/participant-counts-by-name',
  isPermittedTo('read'),
  validate([
    query('category').isIn(['lab', 'dx', 'medication']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['phenotype']
    // #swagger.summary = 'Get '

    const keyword = req.query.keyword || '';

    const table = Prisma.sql`${req.params.category}`;

    const rows = await prisma.$queryRaw`
        select t.name, count(t.name) as count
        from
          ( select distinct name, participant_id 
            from ${table} 
            where name ilike '%'${keyword}'%'
          ) t
        group by t.name
        order by count desc
    `;
    res.json(rows);
  }),
);

router.get(
  '/:category/participants/age/bins',
  isPermittedTo('read'),
  validate([
    query('category').isIn(['lab', 'dx', 'medication']),
    query('name').isString().notEmpty(),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['phenotype']
    // #swagger.summary = 'Get participants with the given phenotype.'

    const { name } = req.query;
    const table = Prisma.sql`${req.params.category}`;

    const rows = await prisma.$queryRaw`
      with data as (
        select extract(year from age(dob)) as age 
        from demographic d
        where d.participant_id = ANY(
          select distinct participant_id from ${table} where name=${name}
        )
      )
      ${histogramSQL('data', 'age', req.query.bins)}
    `;
    res.json(rows);
  }),
);

router.get(
  '/:category/participants/aggregate',
  isPermittedTo('read'),
  validate([
    query('category').isIn(['lab', 'dx', 'medication']),
    query('name').isString().notEmpty(),
    query('field').isIn(['gender', 'race', 'ethnicity']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['phenotype']
    // #swagger.summary = 'Get participants with the given phenotype.'

    const { name, field } = req.query;
    const table = Prisma.sql`${req.params.category}`;
    const column = Prisma.sql`${field}`;

    const _rows = await prisma.$queryRaw`
      select ${column}, count(*) as count 
      from demographic d
      where d.participant_id = ANY(
        select distinct participant_id from ${table} where name=${name}
      )
      group by ${column}
      order by count desc
    `;

    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = parseInt(item.count, 10);
      return acc;
    }, {});

    res.json(distinctValuesWithCounts);
  }),
);

module.exports = router;
