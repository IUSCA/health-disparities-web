const { MeiliSearch } = require('meilisearch');

require('dotenv-safe').config()


const client = new MeiliSearch({ 
  host: process.env['SEARCH_URL'] ? process.env['SEARCH_URL'] : 'http://dgl_meilisearch:7700' , 
  apiKey: process.env['SEARCH_KEY'] ? process.env['SEARCH_KEY'] : 'xyz'
})


const main = async () => {
  console.log('Getting indexes...')
  console.log(process.env['SEARCH_URL'], process.env['SEARCH_KEY'])
  try {
    const indexes = await client.getIndexes()
    console.log(indexes.results)




  } catch(e) {  

    console.log(e)
  }


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
