const express = require('express');
const { Prisma, PrismaClient } = require('@prisma/client');
// const NodeCache = require('node-cache');
const { param, query } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const { validate } = require('../middleware/validators');
const {
  histogramSQL,
} = require('../services/queries');

const isPermittedTo = accessControl('cohort');
const router = express.Router();
const prisma = new PrismaClient();
// const cache = new NodeCache();

router.get(
  '/:category/counts',
  isPermittedTo('read'),
  validate([
    param('category').isIn(['lab', 'dx', 'medication']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['phenotype']
    // #swagger.summary = 'Get total number of labs, diagnosis, medications.'

    const keyword = req.query.keyword || '';

    const table = Prisma.raw(req.params.category);
    const where_sql = keyword ? Prisma.sql`where name ilike ${`%${keyword}%`}` : Prisma.empty;

    const rows = await prisma.$queryRaw`
      select 
        count(distinct name) as count, 
        count(distinct participant_id) as participant_count 
      from ${table}
      ${where_sql}
    `;

    // for dx this query may be faster
    /*
      select
        count(distinct name) as count,
        count(distinct participant_id) as participant_count
      from dx
      where name = any(
        select name from dx_unique_name dun where name ilike '%diabetes%'
      );
    */

    const v = {
      total: parseInt(rows[0].count, 10),
      participants: parseInt(rows[0].participant_count, 10),
    };

    res.json(v);
  }),
);

router.get(
  '/:category/participant-counts-by-name',
  isPermittedTo('read'),
  validate([
    param('category').isIn(['lab', 'dx', 'medication']),
    query('limit').default(10).isInt({ min: 1, max: 100 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['phenotype']
    // #swagger.summary = 'Get '

    const keyword = req.query.keyword || '';

    const where_sql = keyword ? Prisma.sql`where name ilike ${`%${keyword}%`}` : Prisma.empty;
    const table = Prisma.raw(req.params.category);

    const sql = Prisma.sql`
      select t.name, count(t.name) as count
        from
          ( select distinct name, participant_id 
            from ${table} 
            ${where_sql}
          ) t
        group by t.name
        order by count desc
        limit ${req.query.limit} offset ${req.query.offset}
    `;
    // console.log(sql.sql, sql.values);

    const rows = await prisma.$queryRaw(sql);
    const updatedRows = rows.map(({ name, count }) => ({
      name,
      count: parseInt(count, 10),
    }));
    res.json(updatedRows);
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
