const { PrismaClient } = require('@prisma/client');

const { getFieldsWithType } = require('../src/services/model');
require('dotenv-safe').config()

const config = require('config');

const prisma = new PrismaClient();

const Typesense = require('typesense')

let client = new Typesense.Client({
  'nodes': [{
    'host': config.get('typesense.host'), // For Typesense Cloud use xxx.a1.typesense.net
    'port': config.get('typesense.port'),      // For Typesense Cloud use 443
    'protocol': config.get('typesense.protocol')   // For Typesense Cloud use https
  }],
  'apiKey': config.get('typesense.api_key'),
  'connectionTimeoutSeconds': 500000
})


const main = async () => {

  let collection = 'participant'

  // console.log(`Deleting ${collection} collection...`)
  // await client.collections(collection).delete()

  console.log(`Creating ${collection} collection...`)
  createCollection(collection)

  const count = await prisma.participant.count();

  console.log(`Adding ${count} ${collection}...`)
  let x = 0
  while(x < count) {
    let documents = await prisma.participant.findMany({
      skip: x,
      take: 1000,
      include: {demographics: true, labs: true, covid_tests: true, covid_vaxes: true, dxs: true, hospitals: true, medications: true}
    });



    // Make the id a string
    documents = documents.map(obj => {
      // copy each object so the original is not modified
      let newObj = { ...obj };

      // change the value property to a string
      newObj.id = String(newObj.id);

      // return the updated object
      return newObj;
    });




    // Create Documents
    client.collections(collection).documents().import(documents, {action: 'create'})
    .then(result => console.log(result))
    .catch(err => console.log(err))

    // console.log(JSON.stringify(results))

    x = x + 1000
  }


}

// Create Collection
const createCollection = async (model_name) => { 

  let collection = {
    "name": model_name, 
    "enable_nested_fields": true,
    "fields": []
  }
  

  const fields = getFieldsWithType(model_name)


  for(let field of Object.keys(fields)) {
    if(field === 'id') {
      collection.fields.push({"name": field, "type": "string", 'facet': true});
    } else if(fields[field] === 'Int') {
      collection.fields.push({"name": field, "type": "int32"});
    } else if(fields[field] === 'String') {
      collection.fields.push({"name": field, "type": "string"});
    } else {
      collection.fields.push({"name": field, "type": "object[]", "optional": true, 'facet': true});
    }
  }


  console.log('collection', collection)


  let results = await client.collections().create(collection)
  // .then(result => console.log(result))
  // .catch(err => console.log(err))

  console.log(JSON.stringify(results))


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