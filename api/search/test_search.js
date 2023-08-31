const { MeiliSearch } = require('meilisearch');

require('dotenv-safe').config()


const client = new MeiliSearch({ 
  host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://dgl_meilisearch:7700' , 
  apiKey: process.env['SEARCH_KEY'] ? process.env['SEARCH_KEY'] : 'xyz'
})


const main = async () => {

  const result = await client.getIndexes({ limit: 3 })
  console.log(result)

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
