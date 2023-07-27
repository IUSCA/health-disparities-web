const express = require('express');
const createError = require('http-errors');
const { MeiliSearch } = require('meilisearch');
let { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const client = new MeiliSearch({ host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://meilisearch:7700' })

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
    // #swagger.tags = ['cohort']
    const result = await prisma.participant.create(req.body);
    res.json(result);
  }),
);

router.post('/all', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohort']
    const result = await prisma.participant.createMany(req.body);
    res.json(result);
  }),
);

router.post('/saveSetting', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['cohort']
  const name = req.body.name
  const fields = req.body.fields
  const result = await prisma.results_by.createMany({data: {name: name, fields: fields}});
  console.log(result)
  res.json(result);
}),
);


router.get('/metadata', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 
    // #swagger.tags = ['cohort']
    const result =  modelService.getMetadata('participant');
    return res.json(result);
  
}))

// READ
router.post('/search/all', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
    console.log(req.body)

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
    facets = facets.filter(value => ! value.includes('id'));
   
    // Query MeiliSearch
    let data  = await client.index(category).search(search, {sort: [`${sort}:${order}`],  offset: offset, limit: limit, facets: ['participant_id', ...facets]})


    // console.log(data)

    return res.json(data)
}))


router.post('/search/totals', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['cohort']

  // Fuzzy search string
  const search = req.body?.search ? req.body.search: undefined

 const tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication']

 // Build queries for each table
 let queries = []
  for(let table of tables) {
    console.log(table)
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

  // console.log(data)

  // // Convert the results to a dictionary
  // let results = data.results.reduce((acc, field) => {
  //   acc[field.indexUid] = {}
  //   acc[field.indexUid]['total'] = field.estimatedTotalHits
  //   acc[field.indexUid]['participant'] = Object.keys(field.facetDistribution.participant_id).length

    
  //   return acc;
  // }, {});


  // console.log(results)

  return res.json(data);
}));

router.get('/resultsBy', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 

  let resultsBy = await prisma.results_by.findMany()

  return res.json(resultsBy);

}))

router.post('/resultsBy', isPermittedTo('read'), asyncHandler(async (req, res, next) => {

  let includes = req.body?.includes ? req.body.includes: []
  let excludes = req.body?.excludes ? req.body.excludes: []

  let resultsBy = req.body?.resultsBy ? req.body.resultsBy: null

  if(resultsBy) {
    console.log(resultsBy)
    resultsBy = Object.keys(resultsBy).map(v => v.replace('.', 's.'))
  } else {
    return res.status(400).send('resultsBy is required');
  }

  let filter = ``

  let x = 0
  for(let group of Object.keys(includes)) {
    for(let include of includes[group]) {
      if(x == 0) {
        filter = filter + ` ${include.category}s.${include.field} ${include.op} ${include.val}`
      } else {
        console.log("join", include.join)
        filter = filter + ` ${include.join} ${include.category}s.${include.field} ${include.op} ${include.val}`
      }

      x = x + 1
    }
  }

  x = 0

  for(let group of Object.keys(excludes)) {   
    for(let exclude of excludes[group]) {
      if(x == 0) {
        filter = filter + ` AND ${exclude.category}s.${exclude.field} ${exclude.op} ${exclude.val}`
      } else {
        filter = filter + ` ${exclude.join} ${exclude.category}s.${exclude.field} ${exclude.op} ${exclude.val}`
      }

      x = x + 1
    }
  }

  console.log(`filter ${filter}`)
  console.log(`resultsBy ${resultsBy}`)
 
  // Query MeiliSearch
  let data  = await client.index('participants').search("", {filter: filter, limit: 0, facets: resultsBy})

  // console.log(data)

  return res.json(data)

}))


router.post('/saveCohort', isPermittedTo('create', false), asyncHandler(async (req, res, next) => { 
  let name = req.body?.cohort_name ? req.body.cohort_name: null
  let includes = req.body?.includes ? req.body.includes: []
  let excludes = req.body?.excludes ? req.body.excludes: []

  let query = ``

  let x = 0
  for(let group of Object.keys(includes)) {
    for(let include of includes[group]) {
      if(x == 0) {
        query = query + ` ${include.category}s.${include.field} ${include.op} ${include.val}`
      } else {
        console.log("join", include.join)
        query = query + ` ${include.join} ${include.category}s.${include.field} ${include.op} ${include.val}`
      }

      x = x + 1
    }
  }

  x = 0

  for(let group of Object.keys(excludes)) {   
    for(let exclude of excludes[group]) {
      if(x == 0) {
        query = query + ` AND ${exclude.category}s.${exclude.field} ${exclude.op} ${exclude.val}`
      } else {
        query = query + ` ${exclude.join} ${exclude.category}s.${exclude.field} ${exclude.op} ${exclude.val}`
      }

      x = x + 1
    }
  }


  console.log({data: {name: name, query: query}})
  // const result = await prisma.cohort.create({data: {name: name, query: query}})

  let data  = await client.index('participants').search("", {filter: query, limit: 0, facets: ['id']})
  console.log(data)

}))


router.post('/values', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 

  const category = req.body?.category ? req.body.category: null
  const field = req.body?.field ? req.body.field: null
  const search = req.body?.search ? req.body.search: ''

  console.log(category, field, search)

  if(!category || !field ) return res.status(400).send('field and search are required');

  const results = await prisma[category].findMany({
    where: {
      [field]: {
        contains: search,
      },
    },
    select: { [field]: true},
    distinct: [field],
    take: 10, // Limit the number of results to 10
  });

  const values = results.map(item => Object.values(item)[0])

  console.log(values)

  return res.json(values);

}))

router.get('/categories', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {

  return res.json(categories)

}))


router.get('/fields/:name', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 
  // #swagger.tags = ['cohort']
  console.log('name', req.params.name)



  // const result =  modelService.getFields(req.params.name);
  const results = modelService.getFieldsWithType(req.params.name);


  let data = {}

  for(let result of Object.keys(results)) {
    if(results[result] === 'Int' ||  results[result] === 'Decimal') {
      data[result] = ['=', '>', '<', '>=', '<=']
    } else if(results[result] === 'DateTime') {
      data[result] = [ '>', '<', '>=', '<=']
    } else if(results[result] === 'String') {
      data[result] = ['=']
    }
  }

  console.log('result', data)
  return res.json(data);

}))

const checkValues = (obj) => {
  for (let key in obj) {
      if (Array.isArray(obj[key])) {
          for (let item of obj[key]) {
              if (typeof item === 'object' && item !== null) {
                  if ('val' in item && item.val === "") {
                      return false;
                  }
                  if (!checkValues(item)) {
                      return false;
                  }
              }
          }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          if ('val' in obj[key] && obj[key].val === "") {
              return false;
          }
          if (!checkValues(obj[key])) {
              return false;
          }
      }
  }
  return true;
}


const fuzzySearchTable = async (table, search, count = false) => {
  let where = {}
  if(search) {
    // Get the fields for the model
    const fields = getFieldsWithType(table)
    console.log(`fields = ${JSON.stringify(fields)}`)
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
  const fields = modelService.getFieldsWithType('participant');

  let include = {}
  for(const field in fields) {
    if (fields[field] !== 'String' && fields[field] !== 'Int') {
      include[field] = true
    }
  }

  // console.log(include)

    // #swagger.tags = ['cohort']
    const result = await prisma.participant.findUnique({where: {id: parseInt(req.params.id)}, include: include})
    if (result) { return res.json(result); }
    return next(createError.NotFound());
  }),
);

router.get('/mine', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohort']
    const user_id = get_current_user(req, res);

    const result = await prisma.participant.findUnique({where: {user_id: parseInt(user_id)}})
    if (result) { return res.json(result); }
    return next(createError.NotFound());
  }),
);



// UPDATE
router.put('/:id', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohort']
    const result = await prisma.participant.update({ where: { id: req.params.id}, data: req.body});
    res.json(result);
  }),
);

router.put('/all', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohort']
    const result = await prisma.participant.updateMany({ data: req.body});
    res.json(result);
  }),
);



// DELETE
router.delete('/:id', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohort']
    const result = await prisma.participant.delete({ where: {id: req.params.id}});
    res.json(result);
  }),
);

router.delete('/all', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['cohort']
    const result = await prisma.participant.deleteMany({ where: {id: req.params.id}});
    res.json(result);
  }),
);

module.exports = router;