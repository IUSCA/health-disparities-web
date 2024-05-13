const axios = require('axios');
const config = require('config');

const client = axios.create({
  baseURL: config.get('quarry.base_url'),
});

function generate_cohort(text) {
  return client.post('/bioloop_query', {
    text,
  });
}

module.exports = {
  generate_cohort,
};
