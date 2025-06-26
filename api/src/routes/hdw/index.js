const express = require('express');

const router = express.Router();

router.use('/analysis', require('./analysis'));
router.use('/cohorts', require('./cohorts'));
router.use('/search', require('./search'));
router.use('/statistics', require('./statistics'));
router.use('/interventions', require('./interventions'));

module.exports = router;
