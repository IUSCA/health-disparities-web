const express = require('express');

// const logger = require('../services/logger');

const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
// const ollamaService = require('../services/ollama');
// const quarryService = require('../services/quarry');
const openaiService = require('../services/openai');
const { validateCohortQuery } = require('../services/cohort/validation');

const isPermittedTo = accessControl('ollama');
const router = express.Router();

router.post(
  '/generate/name-description',
  isPermittedTo('create'),
  asyncHandler(async (req, res) => {
    const metadata = await openaiService.generate_cohort_name_description(req.body.criteria);
    res.json(metadata);
  }),
);

router.post(
  '/generate/cohort',
  isPermittedTo('create'),
  asyncHandler(async (req, res) => {
    const json = await openaiService.generate_cohort(req.body.text);
    // console.log(JSON.stringify(json, null, 2));
    const query = Object.assign(json?.query, {
      name: 'phenotype',
      namespace: 'edu.iu.sca.biobank',
      version: '1.0.0',
    });
    validateCohortQuery(query);
    res.json(query);
  }),
);

module.exports = router;
