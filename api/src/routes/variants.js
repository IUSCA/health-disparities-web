const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query } = require('express-validator');
const _ = require('lodash/fp');

const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
// const sql = require('../variant_db');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

// const decode_map = {
//   0: '0|0',
//   1: '0|1',
//   2: '1|0',
//   3: '1|1',
//   4: '0/1',
//   6: '1/1',
// };

// router.get(
//   '/:chromosome',
//   isPermittedTo('read'),
//   validate([
//     param('chromosome').isInt().toInt(),
//     query('start').isInt().toInt(),
//     query('end').isInt().toInt(),
//   ]),
//   asyncHandler(async (req, res, next) => {
//     // #swagger.tags = ['Variants']
//     const result = await sql`
//     select chromosome, "position", reference, alternate, idxs.genotype_enc,
//     array_agg(domain_id) as subjects from
//     (
//       select chromosome, "position", reference, alternate,
//         unnest(genotype) as genotype_enc,
//         generate_subscripts(genotype, 1) as subject_id
//       from
//         variant vc
//       where
//         chromosome = ${req.params.chromosome} and
//         "position" between ${req.query.start} and ${req.query.end}
//     ) as idxs
//     join subject s on s.id = idxs.subject_id
//     where idxs.genotype_enc != 0 and idxs.genotype_enc is not null
//     group by chromosome, "position", reference, alternate, idxs.genotype_enc
//     `;
//     const _res = result.map((r) => {
//       const { genotype_enc, ...rest } = r;
//       return {
//         genotype: decode_map[genotype_enc] || genotype_enc,
//         ...rest,
//       };
//     });
//     res.json(_res);
//   }),
// );

function buildOrderByObject(sortOptions) {
  // TODO: multi column sort
  // TODO: handle no sorting case
  // TODO: validate sortkeys
  // TODO: validate sort orders
  const keyOrderPairs = Object.entries(sortOptions || {});
  if (keyOrderPairs.length > 0) {
    const [sortKey, sortOrder] = keyOrderPairs[0];
    return {
      orderBy: {
        [sortKey]: {
          sort: sortOrder,
          nulls: 'last',
        },
      },
    };
  }
  return {};
}

// TODO: chr valid values are 1-22, XX, XY
// convert between (XX, XY) <-> (23, 24)
const annotation_validators = [
  query('chr').isInt().toInt(),
  query('start').isInt().toInt(),
  query('end').isInt().toInt().optional(),
  query('ref').isString().optional(),
  query('alt').isString().optional(),
  query('genes').isString().optional(),
  query('cln_sig').isString().optional(),
];

function buildFilterQuery(_query) {
  const { start } = _query;
  const end = _query.end || start;

  return _.omitBy(_.isNil)({
    chr: _query.chr,
    ref: _query.ref,
    alt: _query.alt,
    position: {
      gte: start,
      lte: end,
    },
    genes: _query.genes,
    cln_sig: _query.cln_sig,
  });
}

// TODO: sort validation: object with columns as keys and either one of {asc, desc} as values
// change this design to suit multi-column sorting - also change in datasets api
router.get(
  '/annotations',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    query('limit').isInt().toInt().optional(),
    query('offset').isInt().toInt().optional(),
    query('sortOptions').isObject().optional(),
  ]),
  asyncHandler(async (req, res, next) => {
    const filterQuery = buildFilterQuery(req.query);
    const dataRetrievalQuery = {
      skip: req.query.offset,
      take: req.query.limit,
      where: filterQuery,
      ...buildOrderByObject(req.query.sortOptions),
    };

    const [annotations, count] = await prisma.$transaction([
      prisma.annotation.findMany({ ...dataRetrievalQuery }),
      prisma.annotation.count({ where: filterQuery }),
    ]);

    res.json({
      metadata: { count },
      annotations,
    });
  }),
);

router.get(
  '/annotations/filters',
  isPermittedTo('read'),
  validate(annotation_validators),
  asyncHandler(async (req, res, next) => {
    const filterQuery = buildFilterQuery(req.query);

    const genesPromise = prisma.annotation.groupBy({
      // genes in filterQuery overrides genes is not null
      where: {
        genes: { not: { equals: null } },
        ...filterQuery,
      },
      by: ['genes'],
      _count: true,
    });

    const cln_sigPromise = prisma.annotation.groupBy({
      // cln_sig in filterQuery overrides cln_sig is not null
      where: {
        cln_sig: { not: { equals: null } },
        ...filterQuery,
      },
      by: ['cln_sig'],
      _count: true,
    });

    const [genes, cln_sig] = await Promise.all([genesPromise, cln_sigPromise]);
    res.json({ genes, cln_sig });
  }),
);

module.exports = router;
