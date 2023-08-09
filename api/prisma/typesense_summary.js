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


   // Get all fields and information on the participant collection
   colls = await tclient.collections('participant').retrieve()

   // Join all fields to query by - removing problematic fields
   const query_by = colls.fields.map(coll => {
     if(! coll.name.includes('id') && ! coll.name.includes('chs_flag')  && ! coll.name.includes('nbr_refills'))
       return coll.name 
   }).join(', ')
 
 
   // Set search parameters
   let searchParameters = {
     'q': '*',
     'query_by': query_by,
     'facet_by': 'demographics.id, labs.id, dxs.id, covid_tests.id, covid_vaxes.id, hospitals.id, medications.id',  // query by id to get a full count by total
     'max_facet_values': 1,
   }
 
   let results = await tclient.collections('participant').documents().search(searchParameters)
   // console.log(JSON.stringify(results.facet_counts))
 
   let data = {}
 
   // Get the total count for each facet
   for(let count of results.facet_counts) {
     data[count.field_name.replace('es.id', '').replace('s.id', '')] = count.stats.total_values 
   }
 
   console.log(JSON.stringify(data))

   let result = await prisma.participant_stats.create({data: {stats: data}})

   console.log(result)


  // let searchParameters = {
  //   'q'         : '*',
  //   'query_by'  : "demographics.ethnicity, demographics.gender, demographics.race",
  //   'filter_by' : "demographics.gender:= 'F'",
  //   'facet_by'  : "demographics.ethnicity, demographics.gender, demographics.race",
  //   'max_facet_values': 1000,
  //   // 'sort_by'   : 'num_employees:desc'
  // }

  // let results = await client.collections('participant').documents().search(searchParameters)
  
  // console.log(JSON.stringify(results.facet_counts))

  // results = results.facet_counts[0].counts.reduce((acc, curr) => {
  //     acc[curr.value] = curr.count;
  //     return acc;
  // }, {});

  // console.log(results)
}


main()
  .catch(e => console.error(e))