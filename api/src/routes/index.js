const express = require('express');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (req, res) => { res.send('OK'); });
router.use('/auth', require('./auth'));
router.use('/reports', require('./reports'));
router.use('/about', require('./about'));

// From this point on, all routes require authentication.
router.use(authenticate);

router.use('/datasets', require('./datasets'));
router.use('/metrics', require('./metrics'));
router.use('/users', require('./users'));
router.use('/workflows', require('./workflows'));
router.use('/projects', require('./projects'));
router.use('/statistics', require('./statistics'));

router.use('/cohorts', require('./cohort2'));
// router.use('/cohort', require('./cohort'));
// router.use('/participant', require('./participant'));
router.use('/variants', require('./variants'));

router.use('/snapshots', require('./snapshots'));
router.use('/sources', require('./sources'));
router.use('/protocols', require('./protocols'));
router.use('/phenotype_files', require('./phenotype_files'));
router.use('/genotype_sets', require('./genotype_sets'));
router.use('/genotype_files', require('./genotype_files'));
router.use('/genotype_samples', require('./genotype_samples'));

module.exports = router;
