const express = require('express');
const createError = require('http-errors');
const { MeiliSearch } = require('meilisearch');
let { PrismaClient, Prisma } = require('@prisma/client')
const { getFieldsWithType } = require('../services/model');

const config = require('config');

const prisma = new PrismaClient()
const client = new MeiliSearch({ host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://meilisearch:7700' })

// const Typesense = require('typesense')

// let tclient = new Typesense.Client({
//   'nodes': [{
//     'host': config.get('typesense.host'), // For Typesense Cloud use xxx.a1.typesense.net
//     'port': config.get('typesense.port'),      // For Typesense Cloud use 443
//     'protocol': config.get('typesense.protocol')   // For Typesense Cloud use https
//   }],
//   'apiKey': config.get('typesense.api_key'),
//   'connectionTimeoutSeconds': 500000
// })

const modelService = require('../services/model');

const categories = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication']

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
  }),
);

router.post('/all', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participant']
    const result = await prisma.participant.createMany(req.body);
    res.json(result);
  }),
);


router.get('/metadata', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 
    // #swagger.tags = ['participant']
    const result =  modelService.getMetadata('participant');
    return res.json(result);
  
}))

// READ
router.post('/search/all', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // console.log(req.body)

  // Fuzzy search string
  const search = req.body?.search ? req.body.search: undefined
  const category = req.body?.category ? req.body.category: null
  
  if (! category) return res.status(400).send('Category is required');

  // Fields - incoming fields or set a default
  // const fields = req.body?.fields ? req.body.fields: ['id', 'hospitals.id', 'labs.name', 'medications.id', 'dxs.id', 'covid_tests.name', 'covid_vaxes.id']

  // Pagination
  const page = req.body?.page ? parseInt(req.body.page): 1
  const numPerPage = req.body?.numPerPage ? parseInt(req.body.numPerPage): 10

  limit = numPerPage
  offset = limit * (page - 1)

  // Column sorting
  const order = req.body.sortingOrder ? req.body.sortingOrder: 'asc'
  const sort = req.body.sortBy ? req.body.sortBy: 'id'

  // Get all fields
  let facets =  await client.index(category).getFilterableAttributes()

  // Remove id fields
  // facets = facets.filter(value => ! value.includes('id'));
 
  // Query MeiliSearch
  let data  = await client.index(category).search(search, {sort: [`${sort}:${order}`],  offset: offset, limit: limit})

  // data.hits = data.hits.filter(value => ! value.includes('id'));

  data.hits = data.hits.map(obj =>
    Object.keys(obj).reduce((acc, key) => {
      if (!key.includes('ib_id') && !key.includes('study_id')) {
        acc[key] = obj[key];
      }
      return acc;
    }, {})
  );

  // console.log(data.hits)

  return res.json(data)
}))





router.post('/search/typesense/facetOptions', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  const table = req.body?.table ? req.body.table: undefined

  console.log(table)

  // let data = await client.index(table).getFilterableAttributes()

  // data = data.filter(value => ! value.includes('id'));

  // Get all fields and information on the participant collection
  colls = await tclient.collections('participant').retrieve()

  // Get all non-id fields for specified table
  const data = colls.fields.map(coll => {
    if(! coll.name.includes('id') && ! coll.name.includes('date') &&  coll.name.includes(table) ) {
      return coll.name.replace(`${table}s.`, '') 
    }
  }).filter(value => value !== undefined && value !== `${table}s`)  // Remove undefined values


  // console.log(data)

  return res.json(data)
}))

router.post('/search/typesense/facets', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
// Fuzzy search string
  const search = req.body?.search ? req.body.search: '*'
  const table = req.body?.table ? req.body.table: undefined
  const chart_category = req.body?.chart_category ? req.body.chart_category: null

  console.log(chart_category, table)

  // Get all fields and information on the participant collection
  colls = await tclient.collections().retrieve()



  const value_query= `SELECT DISTINCT ${chart_category} FROM ${table};`
  const value_names = await prisma.$queryRaw`${Prisma.raw(value_query)}`;
  console.log(JSON.stringify(value_names))


  let query = `SELECT `;

  let x = 0

  for(let value of value_names) {
    console.log(value)

    if(x === value_names.length - 1)
      query = query + `COUNT(DISTINCT CASE WHEN ${chart_category} = '${value[chart_category]}' THEN participant_id ELSE NULL END) AS "${value[chart_category]}" `
    else
      query = query + `COUNT(DISTINCT CASE WHEN ${chart_category} = '${value[chart_category]}' THEN participant_id ELSE NULL END) AS "${value[chart_category]}", `
    
    x = x + 1
  }


  query = query + ` FROM ${table};`



  // const query = `SELECT COUNT(participant_id) FROM (SELECT DISTINCT ${chart_category} FROM ${table}) AS temp;`
  // const query = `SELECT COUNT(DISTINCT participant_id) as ${chart_category}  FROM ${table} GROUP BY ${chart_category};`
  console.log(query)

  const results = await prisma.$queryRaw`${Prisma.raw(query)}`;
  console.log(JSON.stringify(results))

  // let where = { }
  

  // console.log( values.length)

  // let x = 0
  // for(let value of values) {
  //   // console.log(value)


  //   // searchRequests.searches.push({
  //   //   'collection': 'participant',
  //   //   'q': search,
  //   //   'filter_by': `${table}s.${chart_category}:=${value[chart_category]}`,
  //   //   query_by: `${table}s.${chart_category}`,
  //   //   per_page: 0
  //   // })
  //   x = x + 1
  // }

  // const result = await tclient.multiSearch.perform(searchRequests, {limit_multi_searches: 200})

  // console.log(JSON.stringify(result.results.length))


  // let results = {}

  // for(let value in values) {

  //   results[values[value][chart_category]] = result.results[value].found

  // }

  // let results = await tclient.collections('participant').documents().search(searchParameters)
  // console.log(JSON.stringify(results))


  // let data = {}
  // for(let field of results.facet_counts) {

  //   data[field.field_name.replace(`${table}s.`, '')] = field.counts.reduce((acc, curr) => {
  //       acc[curr.value] = curr.count;
  //       return acc;
  //   }, {});
  // }

  // console.log(data)

  // return res.json(data)
  return res.json(results[0])
}))

router.post('/search/meilisearch/facetOptions', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  const table = req.body?.table ? req.body.table: undefined

  let data = await client.index(table).getFilterableAttributes()

  data = data.filter(value => ! value.includes('id') && ! value.includes('date'));

  return res.json(data)
}))

router.post('/search/meilisearch/facets', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
// Fuzzy search string
  const search = req.body?.search ? req.body.search: ""
  const table = req.body?.table ? req.body.table: undefined
  const chart_category = req.body?.chart_category ? req.body.chart_category: null

  // Query MeiliSearch
  let data  = await client.index('participants').search(search, {limit: 0, facets: [`${table}s.${chart_category}`]})

  let results = {}

  for(let str of Object.keys(data.facetDistribution)) {
    results[str.substring(str.indexOf('.')+1)] = data.facetDistribution[str]
  }

  // console.log(JSON.stringify(results))

    // Sort the entries by value
  const sortedEntries = Object.entries(results[chart_category]).sort(([, a], [, b]) => b - a);

  // Create a new object with the sorted entries
  results[chart_category] = Object.fromEntries(sortedEntries);

  // console.log(JSON.stringify(results))

  return res.json(results)
}))


router.post('/search/meilisearch/totals', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']

  // Fuzzy search string
  const search = req.body?.search ? req.body.search: undefined

 const tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication']

 // Build queries for each table
 let queries = []
  for(let table of tables) {
    // console.log(table)
    queries.push({
      indexUid: table,
      q: search,
      limit: 0,
      facets: ['participant_id']
    })

    // await fuzzySearchTable(table, search, true)

  }

  // Get the total number of hits for each table
  let data = await client.multiSearch({ queries: queries } )





  let results = data.results.reduce((acc, field) => {
    acc[field.indexUid] = {}
    acc[field.indexUid]['total'] = field.estimatedTotalHits
    acc[field.indexUid]['participant'] = Object.keys(field.facetDistribution.participant_id).length

    
    return acc;
  }, {});


  console.log(JSON.stringify(results))

  return res.json(results);
}));



router.post('/search/totals', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']

  // Fuzzy search string
  const search = req.body?.search ? req.body.search: `*`



  if(search === '*') {
    // Get the total count for each facet
    let result = await prisma.stats.findFirst({where: {name: 'summary_totals'}})
    if(result) {
      console.log('returning cached data')
      return res.json(result.stats)
    }
  }

  // Get all fields and information on the participant collection
  colls = await tclient.collections('participant').retrieve()

  // Join all fields to query by - removing problematic fields
  const query_by = colls.fields.map(coll => {
    if(! coll.name.includes('id') && ! coll.name.includes('chs_flag')  && ! coll.name.includes('nbr_refills'))
      return coll.name 
  }).join(', ')


  // Set search parameters
  let searchParameters = {
    'q': search,
    'query_by': query_by,
    'facet_by': 'demographics.id, labs.id, dxs.id, covid_tests.id, covid_vaxes.id, hospitals.id, medications.id',  // query by id to get a full count by total
    'max_facet_values': 10,
    per_page: 0,
    limit_hits: 0
    
  }

  let results = await tclient.collections('participant').documents().search(searchParameters)
  console.log(JSON.stringify(results.facet_counts))

  let data = {}

  // Get the total count for each facet
  for(let count of results.facet_counts) {
    data[count.field_name.replace('es.id', '').replace('s.id', '')] = count.stats.total_values 
  }

  console.log(JSON.stringify(data))

  return res.json(data);
}));



router.get('/categories', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {

  return res.json(categories)

}))


router.get('/categories/:name', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 
  // #swagger.tags = ['participant']
  // console.log('name', req.params.name)
  const result =  modelService.getFields(req.params.name);

  // console.log('result', result)
  return res.json(result);

}))


const fuzzySearchTable = async (table, search, count = false) => {
  let where = {}
  if(search) {
    // Get the fields for the model
    const fields = getFieldsWithType(table)
    // console.log(`fields = ${JSON.stringify(fields)}`)
    let OR = []

    

    for(const key of Object.keys(fields)) {
      // Filter table by search string
      if(typeof fields[key] !== 'object') {
        // Set search by field type
        if(fields[key] === 'String') {
          OR.push({[key]: { contains: search}})
        } else if(fields[key] === 'Int' && !isNaN(search)) {
          OR.push({[key]: { in: [parseInt(search)]}})
        }
      }

    }

    

    // Join all OR statements
    if(OR.length > 0) 
      where.OR = OR
      
  }

  // Set the where clause
  let query = {}
  if(where) query.where = where




  // console.log(`query = ${JSON.stringify(query)}`)

  let results

  // Get Data
  if(count) {
    results = await prisma[table].count(query);
  } else {
    results = await prisma[table].findMany(query);
  }


  return results
}


router.get('/:id', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  let fields = modelService.getMetadataAsSelect('participant', ['ib_id', 'study_id', 'participant_id']);

  // console.log(fields)


    // #swagger.tags = ['participant']
    let result = await prisma.participant.findUnique({where: {id: parseInt(req.params.id)}, select: fields})


    if (result) { return res.json(result); }

    return next(createError.NotFound());
  }),
);


router.get('/mine', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participant']
    const user_id = get_current_user(req, res);

    const result = await prisma.participant.findUnique({where: {user_id: parseInt(user_id)}})
    if (result) { return res.json(result); }
    return next(createError.NotFound());
  }),
);



// UPDATE
router.put('/:id', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participant']
    const result = await prisma.participant.update({ where: { id: req.params.id}, data: req.body});
    res.json(result);
  }),
);

router.put('/all', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participant']
    const result = await prisma.participant.updateMany({ data: req.body});
    res.json(result);
  }),
);



// DELETE
router.delete('/:id', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participant']
    const result = await prisma.participant.delete({ where: {id: req.params.id}});
    res.json(result);
  }),
);

router.delete('/all', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participant']
    const result = await prisma.participant.deleteMany({ where: {id: req.params.id}});
    res.json(result);
  }),
);

module.exports = router;