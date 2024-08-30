const express = require('express');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (req, res) => { res.send('OK'); });
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

router.use('/cohorts', require('./cohorts'));
router.use('/participants', require('./participants'));
router.use('/genotypes', require('./genotypes/index'));
router.use('/phenotypes', require('./phenotypes/index'));
router.use('/snapshots', require('./snapshots'));
router.use('/sources', require('./sources'));
router.use('/protocols', require('./protocols'));
router.use('/gen-ai', require('./gen_ai'));
router.use('/icd10', require('./icd10'));

module.exports = router;
