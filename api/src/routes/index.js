const express = require('express');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (req, res) => { res.send('OK'); });
router.use('/auth', require('./auth'));
router.use('/reports', require('./reports'));

// From this point on, all routes require authentication.
router.use(authenticate);

router.use('/datasets', require('./datasets') /* #swagger.security = [{"BearerAuth": []}] */);
router.use('/metrics', require('./metrics') /* #swagger.security = [{"BearerAuth": []}] */);
router.use('/users', require('./users') /* #swagger.security = [{"BearerAuth": []}] */);
router.use('/workflows', require('./workflows') /* #swagger.security = [{"BearerAuth": []}] */);
router.use('/projects', require('./projects') /* #swagger.security = [{"BearerAuth": []}] */);
router.use('/statistics', require('./statistics'));

router.use('/cohort', require('./cohort'));
router.use('/participant', require('./participant'));
router.use('/variants', require('./variants') /* #swagger.security = [{"BearerAuth": []}] */);

router.use('/snapshots', require('./snapshots'));
router.use('/protocols', require('./protocols'));
router.use('/phenotype_files', require('./phenotype_files'));
router.use('/genotype_sets', require('./genotype_sets'));
router.use('/genotype_files', require('./genotype_files'));
router.use('/genotype_samples', require('./genotype_samples'));

module.exports = router;
