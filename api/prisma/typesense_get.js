
require('dotenv-safe').config()



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


  let searchParameters = {
    'q'         : '*',
    'query_by'  : "demographics.ethnicity, demographics.gender, demographics.race",
    'filter_by' : "demographics.gender:= 'F'",
    'facet_by'  : "demographics.ethnicity, demographics.gender, demographics.race",
    'max_facet_values': 1000,
    // 'sort_by'   : 'num_employees:desc'
  }

  let results = await client.collections('participant').documents().search(searchParameters)
  
  console.log(JSON.stringify(results.facet_counts))

  results = results.facet_counts[0].counts.reduce((acc, curr) => {
      acc[curr.value] = curr.count;
      return acc;
  }, {});

  console.log(results)
}


main()
  .catch(e => console.error(e))