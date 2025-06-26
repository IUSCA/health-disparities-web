const express = require('express');
const { Prisma } = require('@prisma/client');

const { param, query } = require('express-validator');
const asyncHandler = require('@/middleware/asyncHandler');
const { accessControl } = require('@/middleware/auth');
const { validate } = require('@/middleware/validators');
const { histogramSQL2 } = require('@/services/queries');
const { CATEGORIES } = require('@/services/cohorts/phenotype/fields');
const { getCounts } = require('@/services/phenotypes');
const prisma = require('@/db');

const isPermittedTo = accessControl('cohorts');
const router = express.Router();

router.use('/files', require('./files'));

router.get(
  '/:category/counts',
  isPermittedTo('read'),
  validate([
    param('category').isIn(['lab', 'dx', 'medication', 'hospital']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Phenotype']
    // #swagger.summary = 'Get total number of labs, diagnosis, medications matching the keyword.'

    const keyword = req.query.keyword || '';

    const v = await getCounts(req.params.category, keyword);

    // client side cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(v);
  }),
);

router.get(
  '/:category/participant-counts-by-name',
  isPermittedTo('read'),
  validate([
    param('category').isIn(['lab', 'dx', 'medication', 'hospital']),
    query('limit').default(10).isInt({ min: 1, max: 100 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Phenotype']
    // #swagger.summary = 'Get '

    const keyword = req.query.keyword || '';

    const name_sql = keyword ? Prisma.sql`and name ilike ${`%${keyword}%`}` : Prisma.empty;

    const sql = Prisma.sql`
        with results as (
          select name, count
          from ehr_participant_counts_by_name
          where category = ${req.params.category} ${name_sql}
              
        )
        select *, count(*) over () as total_count
        from results
        order by count desc
        limit ${req.query.limit} offset ${req.query.offset}
    `;

    // console.log(sql.sql, sql.values);

    const rows = await prisma.$queryRaw(sql);
    const updatedRows = rows.map(({ name, count }) => ({
      name,
      count: parseInt(count, 10),
    }));

    // client side cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json({
      metadata: {
        total_count: Number(rows[0]?.total_count ?? 0),
      },
      results: updatedRows,
    });
  }),
);

router.get(
  '/:category/participants/age/bins',
  isPermittedTo('read'),
  validate([
    param('category').isIn(['lab', 'dx', 'medication', 'hospital']),
    query('name').isString().notEmpty(),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Phenotype']
    // #swagger.summary = 'Get participants with the given phenotype.'

    const { name } = req.query;
    const table = Prisma.raw(req.params.category);

    let sql = Prisma.empty;
    if (req.params.category === 'hospital') {
      sql = Prisma.sql`
        WITH dx_codes AS (
          SELECT DISTINCT code, code_system 
          FROM dx 
          WHERE name = ${name}
        )
        SELECT DISTINCT h.participant_id
        FROM hospital h
        JOIN dx_codes t
        ON h.dx_code = t.code 
        AND h.dx_code_system = t.code_system
      `;
    } else {
      sql = Prisma.sql`select distinct participant_id from ${table} where name=${name}`;
    }

    const rows = await prisma.$queryRaw`
      with data as (
        select age 
        from demographic d
        where d.participant_id = ANY(
          ${sql}
        )
      )
      ${histogramSQL2('data', 'age', req.query.bins)}
    `;

    // client side cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(rows);
  }),
);

router.get(
  '/:category/participants/aggregate',
  isPermittedTo('read'),
  validate([
    param('category').isIn(['lab', 'dx', 'medication', 'hospital']),
    query('name').isString().notEmpty(),
    query('field').isIn(['gender', 'race', 'ethnicity']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Phenotype']
    // #swagger.summary = 'Get participants with the given phenotype.'

    const { name, field } = req.query;
    const table = Prisma.raw(req.params.category);
    const column = Prisma.raw(field);

    let sql = Prisma.empty;
    if (req.params.category === 'hospital') {
      sql = Prisma.sql`
        WITH dx_codes AS (
          SELECT DISTINCT code, code_system 
          FROM dx 
          WHERE name = ${name}
        )
        SELECT DISTINCT h.participant_id
        FROM hospital h
        JOIN dx_codes t
        ON h.dx_code = t.code 
        AND h.dx_code_system = t.code_system
      `;
    } else {
      sql = Prisma.sql`select distinct participant_id from ${table} where name=${name}`;
    }

    const _rows = await prisma.$queryRaw`
      select ${column}, count(*) as count 
      from demographic d
      where d.participant_id = ANY(
        ${sql}
      )
      group by ${column}
      order by count desc
    `;

    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = parseInt(item.count, 10);
      return acc;
    }, {});

    // client side cache indefinitely - 1 year
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(distinctValuesWithCounts);
  }),
);

router.get(
  '/:category/:field/unique',
  accessControl('participant')('read'),
  validate([
    param('category').isIn(CATEGORIES),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Phenotype']
    const { category, field } = req.params;
    const _rows = await prisma[category].groupBy({
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

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    return res.json(distinctValuesWithCounts);
  }),
);

router.get(
  '/:category/:field/startswith/:prefix',
  accessControl('participant')('read'),
  validate([
    param('category').isIn(CATEGORIES),
    query('limit').default(10).isInt({ min: 1, max: 1000 })
      .toInt(),
    query('offset').default(0).isInt({ min: 0 })
      .toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Phenotype']
    const { category, field } = req.params;
    const _rows = await prisma[category].findMany({
      where: {
        [field]: {
          startsWith: req.params.prefix || '',
        },
      },
      orderBy: {
        [field]: 'asc',
      },
      take: req.query.limit,
      skip: req.query.offset,
      distinct: [field],
    });

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    // res.set('Cache-control', 'private, max-age=31536000');
    return res.json(_rows.map((row) => row[field]));
  }),
);

router.get(
  '/dxname',
  accessControl('participant')('read'),
  validate([
    query('limit').default(10).isInt({ min: 1, max: 1000 })
      .toInt(),
    query('offset').default(0).isInt({ min: 0 })
      .toInt(),
    query('text').default(''),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Phenotype']
    const searchText = req.query.text || '';
    const _rows = await prisma.$queryRaw`
      select name
      from dx_unique_name dun
      where similarity(name, ${searchText}) >= 0.1
      order by similarity(name, ${searchText}) desc
      limit ${req.query.limit}
      offset ${req.query.offset}
    `;

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    // res.set('Cache-control', 'private, max-age=31536000');
    return res.json(_rows.map((row) => row.name));
  }),
);

module.exports = router;
