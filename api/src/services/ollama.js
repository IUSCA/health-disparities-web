const axios = require('axios');
const config = require('config');

const client = axios.create({
  baseURL: `http://${config.get('ollama.host')}:${config.get('ollama.port')}/api`,
});

function generate_cohort_name_description(criteria) {
  const base_prompt = `
  Name should be maximum of 3 words. keep description simple.
  
  use medical / scientific terms as the intended audience are researchers.

  Your response should be strictly a json of this format: {"name": "", "description": ""} without any other text.
  `;
  const prompt = 'Based on the given criteria, generate name and description for a cohort.';
  return client.post('/generate', {
    model: 'mistral:latest',
    prompt: `${prompt} \n ${JSON.stringify(criteria)} \n ${base_prompt}`,
    stream: false,
    keep_alive: '1h',
  });
}

module.exports = {
  generate_cohort_name_description,
};
