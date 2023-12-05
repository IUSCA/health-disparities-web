const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query } = require('express-validator');
const _ = require('lodash/fp');
const createError = require('http-errors');
const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

function decode_chromosome(encoded) {
  const mapping = {
    23: 'X',
    24: 'Y',
  };
  return `${mapping[encoded] || encoded}`;
}

function encode_chromosome(decoded) {
  // validate if decoded is a non null string
  // 1-22 should be converted to int
  // X or XX should be converted to 23
  // Y or XY should be converted to 24
  if (!decoded) {
    return null;
  }
  const mapping = {
    X: 23,
    Y: 24,
    XX: 23,
    XY: 24,
  };
  const chr_int = mapping[decoded.toUpperCase()] || parseInt(decoded, 10);
  if (Number.isNaN(chr_int) || chr_int < 1 || chr_int > 24) {
    throw createError(400, 'Invalid input: chromosome is not valid');
  }
  return chr_int;
}

function decode_genotype(encoded, phase) {
  if (phase) {
    const phased_mapping = {
      0: '0|0',
      1: '0|1',
      2: '1|0',
      3: '1|1',
      '-1': '.|.',
    };
    return phased_mapping[encoded];
  }
  const unphased_mapping = {
    0: '0/0',
    1: '0/1',
    2: '1/1',
    '-1': './.',
  };
  return unphased_mapping[encoded];
}

// TODO: move chromosome validation to a validation middleware
// TODO: validate ref and alt are valid nucleotides

function buildFilterQuery(_query) {
  // at least one of chromosome or gene must be provided
  if (!(_query.chr || _query.gene)) {
    throw createError(400, 'At least one of chromosome or gene must be provided');
  }

  const { start } = _query;
  const end = _query.end || start;

  const gene_filter = [];
  if (_query.gene) {
    gene_filter.push({ genes: { contains: _query.gene } });
  }
  if (_query.genes) {
    gene_filter.push({ genes: { in: _query.genes } });
  }

  return _.omitBy(_.isNil)({
    source_id: _query.source_id,
    chr: encode_chromosome(_query.chr),
    ref: _query.ref,
    alt: _query.alt,

    position: start || end ? {
      gte: start,
      lte: end,
    } : null,

    AND: gene_filter,

    cln_sig: _query.cln_sig ? { in: _query.cln_sig } : null,
    func: _query.func ? { in: _query.func } : null,
    exonic_func: _query.exonic_func ? { in: _query.exonic_func } : null,
  });
}

const annotation_validators = [
  query('source_id').isInt().toInt(),
  query('chr').isString().notEmpty().optional(),
  query('start').isInt().toInt().optional(),
  query('end').isInt().toInt().optional(),
  query('ref').isString().optional(),
  query('alt').isString().optional(),
  query('gene').isString().optional(),

  query('func').isArray().optional(),
  query('genes').isArray().optional(),
  query('exonic_func').isArray().optional(),
  query('cln_sig').isArray().optional(),
];

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    query('limit').default(100).isInt().toInt(),
    query('offset').default(0).isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Variants']
    // #swagger.summary = 'Search variants'

    const filterQuery = buildFilterQuery(req.query);
    const dataRetrievalQuery = {
      skip: req.query.offset,
      take: req.query.limit,
      where: filterQuery,
      orderBy: [
        { chr: 'asc' },
        { position: 'asc' },
        { ref: 'asc' },
        { alt: 'asc' },
      ],
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(dataRetrievalQuery, null, 2));

    const [results, count] = await prisma.$transaction([
      prisma.variant_annotation.findMany({ ...dataRetrievalQuery }),
      prisma.variant_annotation.count({ where: filterQuery }),
    ]);

    //  transform allele_counts to allele_number and allle_count
    //  transform encoded values to human readable values
    const results2 = results.map((result) => {
      const { chr, allele_counts, ...rest } = result;
      // example allele_counts
      // [
      //   {
      //     "v": 1,
      //     "count": 328
      //   },
      //   {
      //     "v": 2,
      //     "count": 315
      //   },
      //   {
      //     "v": 0,
      //     "count": 1229
      //   },
      //   {
      //     "v": 3,
      //     "count": 80
      //   }
      // ],
      const allele_number = allele_counts.reduce(
        (total, x) => (x.v >= 0 ? (total + x.count) * 2 : 0),
        0,
      );
      const allele_count = result.phase
        ? allele_counts.reduce((total, x) => { // phased
          if (x.v === 1) {
            return total + x.count;
          }
          if (x.v === 2) {
            return total + x.count;
          }
          if (x.v === 3) {
            return total + x.count * 2;
          }
          return total;
        }, 0)
        : allele_counts.reduce((total, x) => { // unphased
          if (x.v === 1) {
            return total + x.count;
          }
          if (x.v === 2) {
            return total + x.count * 2;
          }
          return total;
        }, 0);

      const genotype_counts = allele_counts.reduce((acc, curr) => {
        const decoded = decode_genotype(curr.v, result.phase);
        acc[decoded] = curr.count;
        return acc;
      }, {});

      return {
        chr: decode_chromosome(chr),
        ...rest,
        allele_number,
        allele_count,
        genotype_counts,
      };
    });

    res.json({
      metadata: { count },
      results: results2,
    });
  }),
);

// function buildOrderByObject(sortOptions) {
//   // TODO: multi column sort
//   // TODO: handle no sorting case
//   // TODO: validate sortkeys
//   // TODO: validate sort orders
//   const keyOrderPairs = Object.entries(sortOptions || {});
//   if (keyOrderPairs.length > 0) {
//     const [sortKey, sortOrder] = keyOrderPairs[0];
//     return {
//       orderBy: {
//         [sortKey]: {
//           sort: sortOrder,
//           nulls: 'last',
//         },
//       },
//     };
//   }
//   return {};
// }

router.get(
  '/filters',
  isPermittedTo('read'),
  validate(annotation_validators),
  asyncHandler(async (req, res, next) => {
    const filterQuery = buildFilterQuery(req.query);

    const cols = ['genes', 'cln_sig', 'func', 'exonic_func'];
    const promises = cols.map((col) => prisma.variant_annotation.groupBy({
      where: {
        [col]: { not: { equals: null } },
        ...filterQuery,
      },
      by: [col],
      _count: true,
    }));

    const results = await Promise.all(promises);
    const results2 = results.map((result, idx) => result.reduce((acc, curr) => {
      const col = cols[idx];
      acc[curr[col]] = curr._count;
      return acc;
    }, {}));
    const filters = _.zipObject(cols, results2);
    res.json(filters);
  }),
);

module.exports = router;
