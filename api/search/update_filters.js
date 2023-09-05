const { PrismaClient } = require('@prisma/client');

const { getFieldsWithType } = require('../src/services/model');

const { MeiliSearch } = require('meilisearch');
const client = new MeiliSearch({ 
  host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://dgl_meilisearch:7700' , 
  apiKey: process.env['SEARCH_KEY'] ? process.env['SEARCH_KEY'] : 'xyz'
})

require('dotenv-safe').config()

const prisma = new PrismaClient();

const main = async () => {

  await updateParticipants()


  let tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication']

  for(let table of tables) {

    await enableFiltering(table)
  }
}

// Enable filtering  and sorting for everything in the model
const enableFiltering = async (model_name) => { 

  // const model_name = 'participant'
  const fields = getFieldsWithType(model_name)

  let values = {}

  values['demographic'] = {maxValuesPerFacet: 50000, maxTotalHits: 7000000}
  values['lab'] = {maxValuesPerFacet: 3000000, maxTotalHits: 7000000}
  values['covid_test'] = {maxValuesPerFacet: 130000, maxTotalHits: 7000000}
  values['covid_vax'] = {maxValuesPerFacet: 70000, maxTotalHits: 7000000}
  values['dx'] = {maxValuesPerFacet: 20000000, maxTotalHits: 20000000}
  values['hospital'] = {maxValuesPerFacet: 400000, maxTotalHits: 7000000}
  values['medication'] = {maxValuesPerFacet: 1600000, maxTotalHits: 7000000}


  let data = []

  for(let field of Object.keys(fields)) {
    console.log(`field = ${field}, type = ${fields[field]}`)
    if(fields[field] === 'String' || fields[field] === 'Int' || fields[field] === 'Decimal' || fields[field] === 'DateTime' || fields[field] === 'Boolean') { 
        data.push(field);
    }
  }

  console.log(`data = ${JSON.stringify(data)}`)

  if(data.length > 0) {
    console.log(`Enabling filtering and sorting for ${model_name}...`)

    await client.index(model_name).updateSettings({
      filterableAttributes: data,
      sortableAttributes: data,
      displayedAttributes: ['*'],
      pagination: { maxTotalHits: values[model_name].maxTotalHits },
    })
    await client.index(model_name).updateFaceting({
      maxValuesPerFacet: values[model_name].maxValuesPerFacet
    })
  }
}

const updateParticipants = async () => {

  let collection = 'participant'


  console.log(`Getting all ${collection} ...`)
  let attributes = await getCollections(collection)

  console.log('Collections: ', JSON.stringify(attributes))

  const result = await client.index('participants').updateFilterableAttributes(attributes)


  await client.index('participants').updateSettings({
    filterableAttributes: attributes,
    sortableAttributes: attributes,
    displayedAttributes: ['*'],
    pagination: { maxTotalHits: 7000000 },
  })
  await client.index('participants').updateFaceting({
    maxValuesPerFacet: 7000000
  })


  console.log(result)

}

const getCollections = async (model_name) => { 

  // console.log('MODEL: ', model_name)
  let all = []


  
  // Get all the fields from prisma
  const fields = getFieldsWithType(model_name)

  // console.log('FIELDS: ', fields)


  // Loop through each field and add it to the collection
  for(let field of Object.keys(fields)) {
    if(fields[field] === 'String' || fields[field] === 'Int' || fields[field] === 'Decimal' || fields[field] === 'DateTime' || fields[field] === 'Boolean') {
      all.push(field);
    } else {
      if(fields[field] !== 'participant') {
        let col = await getCollections(fields[field])
        const newArray = col.map(item => `${field}.${item}`);
        all.push(...newArray)
      }
    }
  }



  return all


}

main()
  .then(() => {
    prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });