const express = require('express');

const router = express.Router();

router.use('/', require('./base'));
router.use('/', require('./single'));
router.use('/', require('./files'));
router.use('/', require('./delete'));

module.exports = router;
