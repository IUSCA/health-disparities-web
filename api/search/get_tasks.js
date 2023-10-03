const { MeiliSearch } = require('meilisearch');

require('dotenv-safe').config()


const client = new MeiliSearch({ 
  host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://dgl_meilisearch:7700' , 
  apiKey: process.env['SEARCH_KEY'] ? process.env['SEARCH_KEY'] : 'xyz'
})


const main = async () => {
  console.log('Getting indexes...')

  let results = await client.getTasks()

  console.log(JSON.stringify(results))

}

const hasIndex = async (indexName) => {
  const indexes = await client.getIndexes()


  for(let index of indexes.results) {
    if(index.uid === indexName) {
      return true
    }
  }

  return false
}

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
