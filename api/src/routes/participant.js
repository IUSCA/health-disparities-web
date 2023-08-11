const express = require('express');
const createError = require('http-errors');
const { MeiliSearch } = require('meilisearch');
let { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const client = new MeiliSearch({ host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://meilisearch:7700' })

const Typesense = require('typesense')

let tclient = new Typesense.Client({
  'nodes': [{
    'host': 'typesense', // For Typesense Cloud use xxx.a1.typesense.net
    'port': '8108',      // For Typesense Cloud use 443
    'protocol': 'http'   // For Typesense Cloud use https
  }],
  'apiKey': 'xyz',
  'connectionTimeoutSeconds': 500000
})

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
    const search = req.body?.search ? req.body.search: '*'
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
    const sort = req.body.sortBy ? `${category}s.${req.body.sortBy}`: `${category}s.name`

   // Get all fields and information on the participant collection
   colls = await tclient.collections('participant').retrieve()

   console.log(JSON.stringify(colls))

   // Join all fields to query by - removing problematic fields
   const query_by = colls.fields.map(coll => {
     if( coll.name.includes(category) && !coll.name.includes('ib_id') && !coll.name.includes('study_id') && !coll.name.includes('participant_id') && !coll.name.includes(`${category}s.id`))
       return coll.name 
   }).join(', ')


   console.log(query_by)

  let searchParameters = {
      'q'         : search,
      'query_by'  : query_by,
      'fields': query_by,
      // 'sort_by': `labs.labs.name:${order}`,
      'page': page,
      'per_page': numPerPage,

    }

  // Query Typesense
  let results = await tclient.collections('participant').documents().search(searchParameters)

  let data = {}

  for(let hit of results.hits) {

    if(data.hits === undefined) data.hits = []

    data.hits = [...data.hits, ...hit.document[`${category}s`]]

    // if(data.hits.length >= numPerPage) break
  }
  data.count = data.hits.length
  data.hits.length = numPerPage


  console.log(data)

  return res.json(data)

}))


router.post('/search/facetOptions', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  const table = req.body?.table ? req.body.table: undefined

  console.log(table)

  // let data = await client.index(table).getFilterableAttributes()

  // data = data.filter(value => ! value.includes('id'));

  // Get all fields and information on the participant collection
  colls = await tclient.collections('participant').retrieve()

  // Get all non-id fields for specified table
  const data = colls.fields.map(coll => {
    if(! coll.name.includes('id') &&  coll.name.includes(table) ) {
      return coll.name.replace(`${table}s.`, '') 
    }
  }).filter(value => value !== undefined && value !== `${table}s`)  // Remove undefined values


  console.log(data)

  return res.json(data)
}))

router.post('/search/facets', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
// Fuzzy search string
  const search = req.body?.search ? req.body.search: '*'
  const table = req.body?.table ? req.body.table: undefined
  const chart_category = req.body?.chart_category ? req.body.chart_category: null

  console.log('category', chart_category)

  // Get all fields and information on the participant collection
  colls = await tclient.collections().retrieve()

  console.log(JSON.stringify(colls))

  // Join all fields to query by - removing problematic fields
  const query_by = colls.fields.map(coll => coll.name).join(', ')


  console.log(query_by)

  let searchRequests = {
    'searches': [
      {
        "q":"*",
        "include": `${table}(${chart_category})`,
        // "filter_by":`$${table}(gender:='M') && $covid_test(result:='Positive')`,
        "facet_by": `${table}(${chart_category})`,
        "collection":`${table}`
      }
  ]}

 
  tclient.multiSearch.perform(searchRequests, {})
  console.log(JSON.stringify(results))


  // let data = {}
  // for(let field of results.facet_counts) {

  //   data[field.field_name.replace(`${table}s.`, '')] = field.counts.reduce((acc, curr) => {
  //       acc[curr.value] = curr.count;
  //       return acc;
  //   }, {});
  // }

  // console.log(data)

  return res.json(data)
}))

router.post('/search/totals', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['participant']

  // Fuzzy search string
  const search = req.body?.search ? req.body.search: `*`


  if(search === '*') {
    // Get the total count for each facet
    let result = await prisma.participant_stats.findFirst({orderBy: {id: 'desc'}})
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