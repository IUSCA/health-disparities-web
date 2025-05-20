const express = require('express');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

/*
  #swagger.responses[400] = {
    description: 'Bad request'
    schema: { $ref: '#/components/schemas/BadRequestError' }
  }

  #swagger.responses[401] = {
    description: 'Authentication information is missing or invalid'
    schema: { $ref: '#/components/schemas/Error' }
  }

  #swagger.responses[403] = {
    description: 'Access denied'
    schema: { $ref: '#/components/schemas/Error' }
  }

  #swagger.responses[404] = {
    description: 'Resource not found'
    schema: { $ref: '#/components/schemas/Error' }
  }

  #swagger.responses[500] = {
    description: 'Internal server error'
    schema: { $ref: '#/components/schemas/Error' }
  }
*/

router.get('/health', (req, res) => {
  // #swagger.tags = ['general', 'public']
  // #swagger.description = 'Health check endpoint.'
  // #swagger.operationId = 'health'
  res.send('OK');
});
router.use('/auth', require('./auth/index'));
router.use('/reports', require('./reports'));
router.use('/about', require('./about'));
router.use('/env', require('./env'));

// From this point on, all routes require authentication.
router.use(authenticate);

router.use('/datasets', require('./datasets'));
router.use('/metrics', require('./metrics'));
router.use('/users', require('./users'));
router.use('/workflows', require('./workflows'));
router.use('/projects', require('./projects'));
router.use('/statistics', require('./statistics'));
router.use('/notifications', require('./notifications'));
router.use('/fs', require('./fs'));
router.use('/uploads', require('./uploads'));
router.use('/instruments', require('./instruments'));

router.use('/cohorts', require('./cohorts'));
router.use('/participants', require('./participants'));
router.use('/genotypes', require('./genotypes/index'));
router.use('/phenotypes', require('./phenotypes/index'));
router.use('/snapshots', require('./snapshots'));
router.use('/sources', require('./sources'));
router.use('/protocols', require('./protocols'));
router.use('/gen-ai', require('./gen_ai'));
router.use('/icd10', require('./icd10'));
router.use('/access_keys', require('./access_keys'));
router.use('/cohort_access_requests', require('./cohort_access_requests'));
router.use('/cohorts2', require('./cohorts2'));

module.exports = router;
