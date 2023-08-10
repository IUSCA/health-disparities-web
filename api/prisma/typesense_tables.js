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

  let collection = 'participant'


  console.log(`Getting all ${collection} collections...`)
  let collections = await getCollections(collection)

  collections.reverse() // Reverse the order so the parent is created first

  console.log('Collections: ', JSON.stringify(collections))


  // Create each collection and delete them if they already exists
  for(let coll of collections) {
    let result = await createCollection(coll)

    console.log(result)
  }


  console.log('Getting all tables from prisma...')
  let tables = [collection]

  // Get all the fields from prisma
  const fields = getFieldsWithType(collection)

  // Loop through each field and add related tables to 
  for(let field of Object.keys(fields)) {
    if(!(fields[field] === 'Int' || fields[field] === 'String' || fields[field] === 'DateTime' || fields[field] === 'Decimal'  )) 
      tables.push(fields[field])
  }




  // Loop through each table and create the documents
  console.log('Creating documents...')
  for(let table of tables) {
    await createDocuments(table)
  }

}

const createDocuments = async (collection) => {

  const count = await prisma[collection].count();

  console.log(`Adding ${count} ${collection}...`)

  // Get them 1000 at a time and add them to the collection
  let x = 0
  while(x < count) {

    let documents = await prisma[collection].findMany({
      skip: x,
      take: 1000,
    });

    // Make the id a string
    documents = documents.map(obj => {
      // copy each object so the original is not modified
      let newObj = { ...obj };

      // change the value property to a string
      newObj.id = String(newObj.id);

      // Create unique id field
      newObj[`${collection}_id`] = String(newObj.id);

      if('participant_id' in newObj) {
        newObj['participant_id'] = String(newObj.participant_id);
        newObj['participant_id_sequence_id'] = parseInt(newObj.participant_id);
      }

      // return the updated object
      return newObj;
    });

    // console.log(documents)

    // Create Documents
    client.collections(collection).documents().import(documents, {action: 'create'})
    .then()
    .catch(err => console.log(err.importResults))

    // console.log(JSON.stringify(results))

    x = x + 1000
  }
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

// Create Collection
const getCollections = async (model_name) => { 

  // console.log('MODEL: ', model_name)
  let collections = []

  let collection = {
    "name": model_name, 
    "fields": []
  }
  
  // Get all the fields from prisma
  const fields = getFieldsWithType(model_name)

  // console.log('FIELDS: ', fields)


  // Loop through each field and add it to the collection
  for(let field of Object.keys(fields)) {
    if(field === 'id') {
      collection.fields.push({"name": `${model_name}_id`, "type": "string", 'facet': true, 'sort': true });
      collection.fields.push({"name": field, "type": "string",  'facet': true, 'sort': true });
      // collection.fields.push({"name": `${model_name}_id`, "type": "string", 'facet': true, 'sort': true});
    } else if(field === 'participant_id') {
      collection.fields.push({"name": 'participant_id', "type": "string", "reference": "participant.participant_id", "facet": true});
    } else if(fields[field] === 'Int') {
      collection.fields.push({"name": field, "type": "int32", "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'String') {
      collection.fields.push({"name": field, "type": "string", "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'DateTime'){
      collection.fields.push({"name": field, "type": "string", "optional": true, 'facet': true, 'sort': true });
    } else if(fields[field] === 'Decimal'){
      collection.fields.push({"name": field, "type": "string", "optional": true, 'facet': true, 'sort': true });
    } else {
      if(fields[field] !== 'participant') {
        let col = await getCollections(fields[field])
        collections.push(...col)
      }
    }
  }

  collections.push(collection)

  return collections


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


main()
  .then(() => {
    prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });