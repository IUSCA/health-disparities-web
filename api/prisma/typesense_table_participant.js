const { PrismaClient } = require('@prisma/client');

const { getFieldsWithType } = require('../src/services/model');
require('dotenv-safe').config()

const prisma = new PrismaClient();

const Typesense = require('typesense')

let client = new Typesense.Client({
  'nodes': [{
    'host': 'typesense', // For Typesense Cloud use xxx.a1.typesense.net
    'port': '8108',      // For Typesense Cloud use 443
    'protocol': 'http'   // For Typesense Cloud use https
  }],
  'apiKey': 'xyz',
  'connectionTimeoutSeconds': 500000
})


const main = async () => {

  let model_name = 'participant'

  let collection = {
    "name": model_name, 
    "fields": []
  }

  const fields = getFieldsWithType(model_name)

  // console.log('FIELDS: ', fields)


  // Loop through each field and add it to the collection
  for(let field of Object.keys(fields)) {
    if(field === 'id') {
      collection.fields.push({"name": field, "type": "string", 'facet': true, 'sort': true});
    } else if(field === 'participant_id') {
      collection.fields.push({"name": field, "type": "string", "reference": "participant.id", "facet": true, "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'Int') {
      collection.fields.push({"name": field, "type": "int32", "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'String') {
      collection.fields.push({"name": field, "type": "string", "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'DateTime'){
      collection.fields.push({"name": field, "type": "string", "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'Decimal'){
      collection.fields.push({"name": field, "type": "string", "optional": true, 'facet': true, 'sort': true });
    }
  }

  console.log('collection', collection)

  // await createCollection(collection)

}

const createCollection = async (collection) => {

  // Delete collection if exists
  await deleteCollection(collection.name)


  // Output the collection to be created
  console.log('collection', collection)

  // Create collection
  let results = await client.collections().create(collection)

  return results
}

const deleteCollection = async (model_name) => {

  if(!collectionExists(model_name)) return

  console.log(`Deleting ${model_name} collection...`)
  await client.collections(model_name).delete()
}

const collectionExists = async (collectionName) => {



client.collections().retrieve()
  .then(collections => {
    const collectionExists = collections.some(collection => collection['name'] === collectionName);
    if (collectionExists) {
      console.log(`Collection ${collectionName} exists.`);
      return true
    } else {
      console.log(`Collection ${collectionName} does not exist.`);
      return false
    }
  })
  .catch(error => {
    console.error(error);
    return false
  });

  return false
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