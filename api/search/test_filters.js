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

  await enableFiltering("demographic")



}

const enableFiltering = async (model_name) => { 

  console.log(`Enabling filtering and sorting for ${model_name}...`)

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

    let results = await client.index(model_name).updateSettings({
      filterableAttributes: data,
      sortableAttributes: data,
      displayedAttributes: ['*'],
      pagination: { maxTotalHits: values[model_name].maxTotalHits },
      faceting: {
        maxValuesPerFacet: values[model_name].maxValuesPerFacet
      }

    })

    console.log(`results = ${JSON.stringify(results)}`)
  }
}


main()
  .then(() => {

  })
  .catch(async (e) => {
    console.error(e);

    process.exit(1);
  });