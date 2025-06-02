const express = require('express');

const router = express.Router();

router.use('/', require('./search'));
router.use('/', require('./single'));
router.use('/', require('./create'));
router.use('/', require('./update'));
router.use('/', require('./files'));
router.use('/', require('./delete'));
router.use('/shares', require('./shares'));
router.use('/favorites', require('./favorites'));

module.exports = router;
