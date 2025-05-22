const express = require('express');
const { param, body } = require('express-validator');
const _ = require('lodash/fp');

const prisma = require('@/db');
const { validate } = require('@/middleware/validators');
const asyncHandler = require('@/middleware/asyncHandler');
const { accessControl } = require('@/middleware/auth');

const isPermittedTo = accessControl('source');
const router = express.Router();

// router.get(
//   '/',
//   isPermittedTo('read'),
//   asyncHandler(async (req, res, next) => {
//     // #swagger.tags = ['sources']
//     const sources = await prisma.$queryRaw`
//       with
//         v as (select source_id, count(*) from variant group by source_id),
//         a as (select source_id, count(*) from annotation group by source_id)
//       select s.*, coalesce(v.count, 0) as num_variants, coalesce(a.count, 0) as num_annotations
//       from source s
//       left join v on s.id = v.source_id
//       left join a on s.id = a.source_id
//       order by s.created_at desc
//     `;
//     res.json(sources);
//   }),
// );

router.get(
  '/',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['sources']
    const sources = await prisma.source.findMany({
      orderBy: {
        id: 'asc',
      },
    });
    res.json(sources);
  }),
);

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').exists(),
    body('published').toBoolean(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['sources']
    const data = _.flow([
      _.pick(['name', 'description', 'published']),
      _.omitBy(_.isNil),
    ])(req.body);
    const source = await prisma.source.create({
      data: {
        ...data,
        author_id: req.user.id,
      },
    });
    res.json(source);
  }),
);

router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isInt().toInt(),
    body('published').toBoolean(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['sources']
    const source = await prisma.source.update({
      where: {
        id: req.params.id,
      },
      data: req.body,
    });
    res.json(source);
  }),
);

module.exports = router;
