const express = require('express');
const createError = require('http-errors');
const { MeiliSearch } = require('meilisearch');
const { PrismaClient, Prisma } = require('@prisma/client');
const config = require('config');
const { getFieldsWithType } = require('../services/model');

const prisma = new PrismaClient();
const client = new MeiliSearch({
  host: process.env.SEARCH_URL ? process.env.SEARCH_URL : 'http://dgl_meilisearch:7700',
  apiKey: process.env.SEARCH_KEY ? process.env.SEARCH_KEY : 'xyz',
});

const modelService = require('../services/model');

const categories = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];

// Useful imports for middleware
// const logger = require('../services/logger');
// const { query, body } = require('express-validator');
// const { validate, addSortSantizer } = require('../middleware/validators');

const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');

const isPermittedTo = accessControl('user');
const router = express.Router();

// CREATE
router.post('/', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = await prisma.participant.create(req.body);
  res.json(result);
}));

router.post('/all', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = await prisma.participant.createMany(req.body);
  res.json(result);
}));

router.get('/metadata', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = modelService.getMetadata('participant');
  return res.json(result);
}));

// READ
router.post('/search/all', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // console.log(req.body)

  // Fuzzy search string
  const search = req.body?.search ? req.body.search : undefined;
  const category = req.body?.category ? req.body.category : null;

  if (!category) return res.status(400).send('Category is required');

  // Fields - incoming fields or set a default
  // const fields = req.body?.fields ? req.body.fields: ['id', 'hospitals.id', 'labs.name', 'medications.id', 'dxs.id', 'covid_tests.name', 'covid_vaxes.id']

  // Pagination
  const page = req.body?.page ? parseInt(req.body.page) : 1;
  const numPerPage = req.body?.numPerPage ? parseInt(req.body.numPerPage) : 10;

  limit = numPerPage;
  offset = limit * (page - 1);

  // Column sorting
  const order = req.body.sortingOrder ? req.body.sortingOrder : 'asc';
  const sort = req.body.sortBy ? req.body.sortBy : 'id';

  // Get all fields
  // let facets =  await client.index(category).getFilterableAttributes()

  // Remove id fields
  // facets = facets.filter(value => ! value.includes('id'));

  // Query MeiliSearch
  const data = await client.index(category).search(search, { sort: [`${sort}:${order}`], offset, limit });

  // data.hits = data.hits.filter(value => ! value.includes('id'));

  data.hits = data.hits.map((obj) => Object.keys(obj).reduce((acc, key) => {
    if (!key.includes('ib_id') && !key.includes('study_id')) {
      acc[key] = obj[key];
    }
    return acc;
  }, {}));

  // console.log(data.hits)

  return res.json(data);
}));

// PARTICIPANT FILTER AND SEARCH
router.post('/search/participants', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // console.log(req.body)

  // Fuzzy search string
  const search = req.body?.search ? req.body.search : undefined;

  // Category
  const category = req.body?.category ? req.body.category : null;
  if (!category) return res.status(400).send('Category is required');

  const filters = checkValues(req.body?.filters) ? createSearchFilter(req.body.filters) : null;

  // Pagination
  const page = req.body?.page ? parseInt(req.body.page) : 1;
  const numPerPage = req.body?.numPerPage ? parseInt(req.body.numPerPage) : 10;

  limit = numPerPage;
  offset = limit * (page - 1);

  // Get all fields
  const { fields } = modelService.getMetadata(category);

  // Pluralize category
  const categories = (category === 'covid_vax') ? 'covid_vaxes' : `${category}s`;

  // Column sorting
  const order = req.body.sortingOrder ? req.body.sortingOrder : 'asc';
  const sort = req.body.sortBy ? req.body.sortBy : `${categories}.participant_id`;

  // Assign fields to retrieve
  const attributesToRetrieve = fields.map((field) => `${categories}.${field}`);

  // Setup options for Count first as it has fewer options
  const options = { limit: 0 };

  if (filters) { options.filter = filters; }

  // Setup options for search
  options.limit = limit;
  options.offset = offset;
  options.sort = [`${categories}.${sort}:${order}`];
  options.attributesToRetrieve = attributesToRetrieve;

  console.log(options);

  // Query MeiliSearch
  const data = await client.index('participants').search(search, options);

  console.log(data);

  data.participant_count = data.estimatedTotalHits;

  const results = [];

  for (const result in data.hits) {
    // dynamically get column data
    if (categories in data.hits[result]) {
      if (categories === 'demographics') {
        cat = data.hits[result][categories][0];

        const row = {};
        for (const field of fields) {
          if (field !== 'id' && field !== 'study_id' && field !== 'ib_id') { row[field] = cat[field]; }
        }

        results.push(row);
      } else {
        for (const cat of data.hits[result][categories]) {
          const row = {};
          for (const field of fields) {
            if (field !== 'id' && field !== 'study_id' && field !== 'ib_id') { row[field] = cat[field]; }
          }

          results.push(row);
        }
      }
    }
  }

  data.hits = results;
  data.count = results.length;

  return res.json(data);
}));

const createSearchFilter = (filters) => {
  let x = 0;
  let filter = '';
  for (const include of filters) {
    if (x == 0) {
      filter += `'${include.category}s.${include.field}' ${include.op} '${include.val}' `;
    } else {
      console.log('join', include.join);
      filter += ` ${include.join} '${include.category}s.${include.field}' ${include.op} '${include.val}'`;
    }

    x += 1;
  }

  return filter;
};

const checkValues = (obj) => {
  for (const key in obj) {
    if (obj[key].val === null || obj[key].val === undefined || obj[key].val === '') return false;
  }
  return true;
};

const calculateYearsSince = (dateString) => {
  const currentDate = new Date();
  const inputDate = new Date(dateString);

  const yearsDiff = currentDate.getFullYear() - inputDate.getFullYear();

  // Check if the current month and day are before the input date's month and day
  if (
    currentDate.getMonth() < inputDate.getMonth()
    || (currentDate.getMonth() === inputDate.getMonth()
      && currentDate.getDate() < inputDate.getDate())
  ) {
    // If so, subtract 1 from the difference in years
    return yearsDiff - 1;
  }

  return yearsDiff;
};

const calculateAge = (dateString) => {
  // Get the current date
  const currentDate = new Date();

  // Convert the provided date string to a Date object
  const birthDate = new Date(dateString);

  // Calculate the age
  let age = currentDate.getFullYear() - birthDate.getFullYear();

  // Check if the birthday hasn't occurred yet this year
  if (currentDate.getMonth() < birthDate.getMonth()
      || (currentDate.getMonth() === birthDate.getMonth()
       && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const flattenByKey = (arr, key) => arr.flatMap((item) => item[key].map((obj) => ({ ...obj })));

router.post('/search/meilisearch/facetOptions', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  const table = req.body?.table ? req.body.table : undefined;

  let data = await client.index(table).getFilterableAttributes();

  data = data.filter((value) => !value.includes('id') && !value.includes('date'));

  return res.json(data);
}));

router.post('/search/meilisearch/facets', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
// Fuzzy search string
  const search = req.body?.search ? req.body.search : '';
  let table = req.body?.table ? req.body.table : undefined;
  const chart_category = req.body?.chart_category ? req.body.chart_category : null;

  table = (table === 'covid_vax') ? 'covid_vaxes' : `${table}s`;

  console.log(table, chart_category, search);

  // Query MeiliSearch
  const data = await client.index('participants').search(search, { limit: 0, facets: [`${table}.${chart_category}`] });

  const results = {};

  for (const str of Object.keys(data.facetDistribution)) {
    results[str.substring(str.indexOf('.') + 1)] = data.facetDistribution[str];
  }

  // console.log(JSON.stringify(results))

  // Sort the entries by value
  const sortedEntries = Object.entries(results[chart_category]).sort(([, a], [, b]) => b - a);

  // Create a new object with the sorted entries
  results[chart_category] = Object.fromEntries(sortedEntries);

  // console.log(JSON.stringify(results))

  return res.json(results);
}));

router.post('/search/meilisearch/totals', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']

  // Fuzzy search string
  const search = req.body?.search ? req.body.search : undefined;

  const tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];

  // Build queries for each table
  const queries = [];
  for (const table of tables) {
    // console.log(table)
    queries.push({
      indexUid: table,
      q: search,
      limit: 0,
      facets: ['participant_id'],
    });

    // await fuzzySearchTable(table, search, true)
  }

  // Get the total number of hits for each table
  const data = await client.multiSearch({ queries });

  const results = data.results.reduce((acc, field) => {
    acc[field.indexUid] = {};
    acc[field.indexUid].total = field.estimatedTotalHits;
    acc[field.indexUid].participant = Object.keys(field.facetDistribution.participant_id).length;

    return acc;
  }, {});

  console.log(JSON.stringify(results));

  return res.json(results);
}));

router.post('/search/totals', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']

  // Fuzzy search string
  const search = req.body?.search ? req.body.search : '*';

  if (search === '*') {
    // Get the total count for each facet
    const result = await prisma.stats.findFirst({ where: { name: 'summary_totals' } });
    if (result) {
      console.log('returning cached data');
      return res.json(result.stats);
    }
  }

  // Get all fields and information on the participant collection
  colls = await tclient.collections('participant').retrieve();

  // Join all fields to query by - removing problematic fields
  const query_by = colls.fields.map((coll) => {
    if (!coll.name.includes('id') && !coll.name.includes('chs_flag') && !coll.name.includes('nbr_refills')) { return coll.name; }
  }).join(', ');

  // Set search parameters
  const searchParameters = {
    q: search,
    query_by,
    facet_by: 'demographics.id, labs.id, dxs.id, covid_tests.id, covid_vaxes.id, hospitals.id, medications.id', // query by id to get a full count by total
    max_facet_values: 10,
    per_page: 0,
    limit_hits: 0,

  };

  const results = await tclient.collections('participant').documents().search(searchParameters);
  // console.log(JSON.stringify(results.facet_counts))

  const data = {};

  // Get the total count for each facet
  for (const count of results.facet_counts) {
    data[count.field_name.replace('es.id', '').replace('s.id', '')] = count.stats.total_values;
  }

  // console.log(JSON.stringify(data))

  return res.json(data);
}));

router.get('/categories', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  const results = modelService.getRelationships('participant');

  return res.json(results);
}));

router.get('/categories/:name', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  // console.log('name', req.params.name)
  const result = modelService.getFields(req.params.name);

  // console.log('result', result)
  return res.json(result);
}));

const fuzzySearchTable = async (table, search, count = false) => {
  const where = {};
  if (search) {
    // Get the fields for the model
    const fields = getFieldsWithType(table);
    // console.log(`fields = ${JSON.stringify(fields)}`)
    const OR = [];

    for (const key of Object.keys(fields)) {
      // Filter table by search string
      if (typeof fields[key] !== 'object') {
        // Set search by field type
        if (fields[key] === 'String') {
          OR.push({ [key]: { contains: search } });
        } else if (fields[key] === 'Int' && !isNaN(search)) {
          OR.push({ [key]: { in: [parseInt(search)] } });
        }
      }
    }

    // Join all OR statements
    if (OR.length > 0) { where.OR = OR; }
  }

  // Set the where clause
  const query = {};
  if (where) query.where = where;

  // console.log(`query = ${JSON.stringify(query)}`)

  let results;

  // Get Data
  if (count) {
    results = await prisma[table].count(query);
  } else {
    results = await prisma[table].findMany(query);
  }

  return results;
};

router.get('/:id', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  const fields = modelService.getMetadataAsSelect('participant', ['ib_id', 'study_id', 'participant_id']);

  // console.log(fields)

  // #swagger.tags = ['participant']
  const result = await prisma.participant.findUnique({ where: { id: parseInt(req.params.id) }, select: fields });

  if (result) { return res.json(result); }

  return next(createError.NotFound());
}));

router.get('/mine', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const user_id = get_current_user(req, res);

  const result = await prisma.participant.findUnique({ where: { user_id: parseInt(user_id) } });
  if (result) { return res.json(result); }
  return next(createError.NotFound());
}));

// UPDATE
router.put('/:id', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = await prisma.participant.update({ where: { id: req.params.id }, data: req.body });
  res.json(result);
}));

router.put('/all', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = await prisma.participant.updateMany({ data: req.body });
  res.json(result);
}));

// DELETE
router.delete('/:id', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = await prisma.participant.delete({ where: { id: req.params.id } });
  res.json(result);
}));

router.delete('/all', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']
  const result = await prisma.participant.deleteMany({ where: { id: req.params.id } });
  res.json(result);
}));

router.get('/ib_id/:ib_id', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  const participants = await prisma.participant.findMany({
    where: {
      ib_id: req.params.ib_id,
    },
  });
  res.json(participants);
}));

module.exports = router;
