const express = require('express');

// const logger = require('../services/logger');

const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const ollamaService = require('../services/ollama');

const isPermittedTo = accessControl('ollama');
const router = express.Router();

router.post(
  '/generate/name-description',
  isPermittedTo('create'),
  asyncHandler(async (req, res) => {
    const http_res = await ollamaService.generate_cohort_name_description(req.body.criteria);
    const generated_text = http_res.data?.response;
    // eslint-disable-next-line no-console
    console.log({ generated_text });

    res.json(JSON.parse(generated_text.trim()));
  }),
);

module.exports = router;
