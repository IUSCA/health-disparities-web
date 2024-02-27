const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param } = require('express-validator');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');

const isPermittedTo = accessControl('cohort');
const router = express.Router();
const CATEGORIES = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];
router.get(
  '/:category/:field/unique',
  isPermittedTo('read'),
  validate([
    param('category').isIn(CATEGORIES),
  ]),
  asyncHandler(async (req, res, next) => {
    const { category, field } = req.params;
    const _rows = await prisma[category].groupBy({
      by: [field],
      _count: {
        [field]: true,
      },
      orderBy: {
        _count: {
          [field]: 'desc',
        },
      },
    });
    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = item._count[field];
      return acc;
    }, {});

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    return res.json(distinctValuesWithCounts);
  }),
);

module.exports = router;
