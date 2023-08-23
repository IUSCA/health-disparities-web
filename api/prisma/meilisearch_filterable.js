const { PrismaClient } = require('@prisma/client');

const { getFieldsWithType } = require('../src/services/model');
require('dotenv-safe').config()

const prisma = new PrismaClient();

const main = async () => {

  let collection = 'participant'


  console.log(`Getting all ${collection} collections...`)
  let collections = await getCollections(collection)

  collections.reverse() // Reverse the order so the parent is created first

  console.log('Collections: ', JSON.stringify(collections))


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
        all.push(...col)
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