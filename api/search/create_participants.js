const { PrismaClient } = require('@prisma/client');
const { MeiliSearch } = require('meilisearch');
const { getFieldsWithType } = require('../src/services/model');
require('dotenv-safe').config()

const prisma = new PrismaClient();
const client = new MeiliSearch({ host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://dgl_meilisearch:7700' })

const main = async () => {

  const count = await prisma.participant.count();

  console.log(`Indexing ${count} participants...`)
  let x = 0
  // while(x < count) {
    const participants = await prisma.participant.findMany({
      skip: x,
      take: 10,
      include: {demographics: true, labs: true, covid_tests: true, covid_vaxes: true, dxs: true, hospitals: true, medications: true}
    });


    console.log(participants)

    // let results = await client.index('participants').addDocuments(participants, { primaryKey: 'id' })
    // console.log(results)

    x = x + 1000
  // }

  // console.log('Enabling filtering and sorting...')
  // enableFiltering('participant')
}

// Enable filtering  and sorting for everything in the model
const enableFiltering = async (model_name) => { 

  // const model_name = 'participant'
  const fields = getFieldsWithType(model_name)

  let data = []

  for(let field of Object.keys(fields)) {
    if(fields[field] === 'Int' || fields[field] === 'String' || fields[field] === 'DateTime' || fields[field] === 'Decimal'  ) {
      // if(! field.includes('id'))
        data.push(field);
    
    } else {

      let subFields = getFieldsWithType(fields[field]);
      for(let subField of Object.keys(subFields)) {
        if(subFields[subField] === 'Int' || subFields[subField] === 'String' || subFields[subField] === 'DateTime' || subFields[subField] === 'Decimal' ) {
          // if(! subField.includes('id'))
            data.push(`${field}.${subField}`)
        } 
      }

    }

  }


  await client.index('participants').updateSettings({
    filterableAttributes: data,
    sortableAttributes: data,
  })

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