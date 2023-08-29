const express = require('express');
const createError = require('http-errors');
const { MeiliSearch } = require('meilisearch');
let { PrismaClient } = require('@prisma/client')

const config = require('config');

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




router.get('/resultsBy', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 

  let resultsBy = await prisma.results_by.findMany()

  return res.json(resultsBy);

}))



// USING MEILISEARCH
router.post('/meilisearch/resultsBy', isPermittedTo('read'), asyncHandler(async (req, res, next) => {

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
  for(let group of includes) {
    for(let include of group.query) {
      if(x == 0) {
        filter = filter + ` '${include.category}s.${include.field}' ${include.op} '${include.val}'`
      } else {
        console.log("join", include.join)
        filter = filter + ` ${include.join} '${include.category}s.${include.field}' ${include.op} '${include.val}'`
      }

      x = x + 1
    }
  }

  

  if(checkValues(excludes)) {
    x = 0

      for(let group of excludes) {
        for(let exclude of group.query) {
        if(x == 0) {
          filter = filter + ` AND '${exclude.category}s.${exclude.field}' ${exclude.op} '${exclude.val}'`
        } else {
          filter = filter + ` ${exclude.join} '${exclude.category}s.${exclude.field}' ${exclude.op} '${exclude.val}'`
        }

        x = x + 1
      }
    }
  }

  console.log(`filter ${filter}`)
  console.log(`resultsBy ${resultsBy}`)
 
  // Query MeiliSearch
  let results  = await client.index('participants').search("", {filter: filter, limit: 0, facets: resultsBy})

  console.log(results)

  let data = {}

  data.participants = results.estimatedTotalHits

  for(let field of Object.keys(results.facetDistribution)) {
    data[field] = sortObject(results.facetDistribution[field])
  }

  console.log(data)

  return res.json(data)

}))


sortObject = (obj) => {

    // Sort the entries by value
    const sortedEntries = Object.entries(obj).sort(([, a], [, b]) => b - a);

    // Create a new object with the sorted entries
    obj = Object.fromEntries(sortedEntries);

    return obj

}


router.post('/saveGroup', isPermittedTo('create'), asyncHandler(async (req, res, next) => {
  let id = req.body?.id ? req.body.id: null
  let name = req.body?.name ? req.body.name: null
  let query = req.body?.query ? req.body.query : null

  if(!name && !query) return res.status(400).send('name and query are required');





  let result = {}
  
  if(id) {
    result = await prisma.group.update({where: {id: id}, data: {name: name, query: query}})
  } else {
    result = await prisma.group.create({data: {name: name, query: query}})
  }

  return res.json(result)

}))

router.get('/mine', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 

  // const user_id = get_current_user(req, res);

  // const result = await prisma.cohort.findUnique({where: {user_id: parseInt(user_id)}})
  const results = await prisma.cohort.findMany()


  for(let result of results) {

    const count = await prisma.cohort_participants.count({
      where: {
        cohort_id: result.id,
      },
    });
    result.participants = count
  }

  console.log(results)
  
  // return results.length;
  if (results) { return res.json(results); }

  return next(createError.NotFound());
}))

router.get('/groups', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
  
    const result = await prisma.group.findMany()
  
    return res.json(result)
  
}))

router.post('/saveCohort', isPermittedTo('create', false), asyncHandler(async (req, res, next) => { 
  let cohort_name = req.body?.cohort_name ? req.body.cohort_name: null
  let id = req.body?.id ? req.body.id: null
  let includes = req.body?.includes ? req.body.includes: []
  let excludes = req.body?.excludes ? req.body.excludes: []

  console.log('NAME', cohort_name)
  console.log()

  let filter = ``

  let x = 0
  for(let group of includes) {
    for(let include of group.query) {
      if(x == 0) {
        filter = filter + `'${include.category}s.${include.field}' ${include.op} '${include.val}' `
      } else {
        console.log("join", include.join)
        filter = filter + ` ${include.join} '${include.category}s.${include.field}' ${include.op} '${include.val}'`
      }

      x = x + 1
    }
  }


  if(checkValues(excludes)) {
    x = 0
    for(let group of excludes) {
      for(let exclude of group.query) {
        if(x == 0) {
          filter = filter + ` AND '${exclude.category}s.${exclude.field}' ${exclude.op} '${exclude.val}'`
        } else {
          filter = filter + ` ${exclude.join} '${exclude.category}s.${exclude.field}' ${exclude.op} '${exclude.val}'`
        }

        x = x + 1
      }
    }
  }

  // Create Cohort
  let cohort_data = {name: cohort_name, query: {includes: includes, excludes: excludes}}


  if(id) {
    const result = await prisma.cohort.update({where: {id: id}, data: cohort_data})

    // Remove old IDs from previous cohort creation/update
    await prisma.cohort_participants.deleteMany({where: {cohort_id: id}})

    // Get Participants IDs
    console.log({filter: filter, fields: ['id'], limit: 1000000 })
    let data = await client.index('participants').getDocuments({filter: filter, fields: ['id'], limit: 1000000 })


    // Create Cohort Participants Query
    let query = { data: []}
    query.data = data.results.map(v => {return {participant_id: v.id, cohort_id: result.id}})


    // Create Cohort Participants
    let results = await prisma.cohort_participants.createMany(query)

    console.log(results)

    return res.json(results)

  } else {
    const result = await prisma.cohort.create({data: cohort_data})

    // Get Participants IDs
    console.log({filter: filter, fields: ['id'], limit: 1000000 })
    let data = await client.index('participants').getDocuments({filter: filter, fields: ['id'], limit: 1000000 })


    // Create Cohort Participants Query
    let query = { data: []}
    query.data = data.results.map(v => {return {participant_id: v.id, cohort_id: result.id}})


    // Create Cohort Participants
    let results = await prisma.cohort_participants.createMany(query)

    console.log(results)

    return res.json(results)
  }
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

  console.log(`results = ${JSON.stringify(results)}`)

  const values = results.map(item => Object.values(item)[0])

  console.log(`values = ${JSON.stringify(values)}`)

  return res.json(values);

}))

router.get('/categories', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {

  return res.json(categories)

}))

router.get('/fields/metadata/:name', isPermittedTo('read'), asyncHandler(async (req, res, next) => { 
  // #swagger.tags = ['cohort']
  console.log('name', req.params.name)
  const result =  modelService.getFields(req.params.name);

  console.log('result', result)
  return res.json(result);

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

  // for(let result of Object.keys(results)) {
  //   if(results[result] === 'Int' ||  results[result] === 'Decimal') {
  //     data[result] = ['equals', 'gt', 'lt', 'gte', 'lte']
  //   } else if(results[result] === 'DateTime') {
  //     data[result] = [ 'gt', 'lt', 'gte', 'lte']
  //   } else if(results[result] === 'String') {
  //     data[result] = ['equals', 'contains', 'startsWith', 'endsWith']
  //   }
  // }

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

const  invertSymbol = (symbol) => {
  switch (symbol) {
      case '=':
          return '!=';
      case '>':
          return '<';
      case '<':
          return '>';
      case '>=':
          return '<=';
      case '<=':
          return '>=';
      default:
          return 'Invalid symbol';
  }
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