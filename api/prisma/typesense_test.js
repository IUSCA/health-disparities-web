const { PrismaClient } = require('@prisma/client');

const { getFieldsWithType } = require('../src/services/model');
require('dotenv-safe').config()

const prisma = new PrismaClient();



const Typesense = require('typesense')

let tclient = new Typesense.Client({
  'nodes': [{
    'host': 'typesense', // For Typesense Cloud use xxx.a1.typesense.net
    'port': '8108',      // For Typesense Cloud use 443
    'protocol': 'http'   // For Typesense Cloud use https
  }],
  'apiKey': 'xyz',
  'connectionTimeoutSeconds': 500000
})



const main = async () => {


   // Get all collections and fields
  //  colls = await tclient.collections().retrieve()

  //  console.log(JSON.stringify(colls))

   // Join all fields to query by - removing problematic fields
  //  const query_by = colls.map(coll => coll.name ).join(', ')
 
  // console.log(query_by)


  let searchRequests = {
    'searches': [
      {
        "q":"*",
        // "query_by": "$demographic(gender)",
        "filter_by":"$demographic(gender:='M') && $covid_test(result:='Positive')",
        "limit": 2,
        "collection":"participant"
      }
  ]}

 
  tclient.multiSearch.perform(searchRequests, {}).then(results => {

  //  let results = await tclient.collections().documents().search(searchParameters)
   console.log("DATA: ", JSON.stringify(results))
 
  }).catch(err => {
    console.log(err)
  })



}


main()
  .catch(e => console.error(e))