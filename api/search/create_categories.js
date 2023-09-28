const { PrismaClient } = require('@prisma/client');
const { MeiliSearch } = require('meilisearch');
const { getFieldsWithType } = require('../src/services/model');
require('dotenv-safe').config()

const prisma = new PrismaClient();

console.log(process.env['SEARCH_URL'])

const client = new MeiliSearch({ 
  host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://dgl_meilisearch:7700' , 
  apiKey: process.env['SEARCH_KEY'] ? process.env['SEARCH_KEY'] : 'xyz'
})

const main = async () => {
  let tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication']

  for(let table of tables) {
  const count = await prisma[table].count();

  console.log(`Indexing ${count} ${table}...`)
  let x = 0
  while(x <= count) {
    console.log(`x = ${x}`)
    const data = await prisma[table].findMany({
      skip: x,
      take: 1000,
    });

    console.log(data)

    await client.index(table).addDocuments(data, { primaryKey: 'id' })
    x += 1000
  }

  console.log(`Enabling filtering and sorting for ${table}...`)
  enableFiltering(table)

}
}

// Enable filtering  and sorting for everything in the model
const enableFiltering = async (model_name) => { 

  // const model_name = 'participant'
  const fields = getFieldsWithType(model_name)

  let data = []

  for(let field of Object.keys(fields)) {
    console.log(`field = ${field}, type = ${fields[field]}`)
    if(fields[field] === 'Int' || fields[field] === 'String') { 
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
    })
  }
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
