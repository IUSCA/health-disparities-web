const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body } = require('express-validator');
const _ = require('lodash/fp');
const createError = require('http-errors');
const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

const NUMERIC_COLS = ['cadd_phred', 'polyphen_max', 'revel_max', 'sift_max'];

function decode_chromosome(encoded) {
  const mapping = {
    23: 'X',
    24: 'Y',
  };
  return `${mapping[encoded] || encoded}`;
}

function encode_chromosome(decoded) {
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

function rangeToQuery(rangeQuery) {
  // convert { min: 1, max: 2 } to { gte: 1, lte: 2 }
  // if min or max is NaN, exclude that condition
  const ret = _.omitBy(_.isNaN)({
    gte: rangeQuery.min,
    lte: rangeQuery.max,
  });
  // if there are no keys, return null
  if (Object.keys(ret).length === 0) {
    return null;
  }
  return ret;
}

function buildFilterQuery(_query) {
  // console.log(_query);
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
  if (_query.genes?.length) {
    gene_filter.push({ genes: { in: _query.genes } });
  }

  const numeric_filters = NUMERIC_COLS.reduce((acc, col) => {
    acc[col] = rangeToQuery(_query[col]);
    return acc;
  }, {});

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

    cln_sig: _query.cln_sig?.length ? { in: _query.cln_sig } : null,
    func: _query.func?.length ? { in: _query.func } : null,
    exonic_func: _query.exonic_func?.length ? { in: _query.exonic_func } : null,
    ...numeric_filters,
  });
}

function isValidNucleotide(nucleotide) {
  if (!['A', 'C', 'G', 'T'].includes(nucleotide)) {
    throw new Error('Invalid nucleotide');
  }
  return true;
}

function rangeValidator(fieldName) {
  return [
    body(`${fieldName}.min`).optional().toFloat(),
    body(`${fieldName}.max`).optional().toFloat(),
  ];
}

const annotation_validators = [
  body('source_id').isInt().toInt(),
  body('chr').isString().notEmpty().optional(),
  body('start').isInt().toInt().optional(),
  body('end').isInt().toInt().optional(),
  body('ref').custom(isValidNucleotide).optional(),
  body('alt').custom(isValidNucleotide).optional(),
  body('gene').isString().notEmpty().optional(),

  body('func').isArray().optional(),
  body('genes').isArray().optional(),
  body('exonic_func').isArray().optional(),
  body('cln_sig').isArray().optional(),
  ...NUMERIC_COLS.map(rangeValidator),
];

router.post(
  '/',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    body('limit').default(100).isInt().toInt(),
    body('offset').default(0).isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Variants']
    // #swagger.summary = 'Search variants'

    const filterQuery = buildFilterQuery(req.body);
    const dataRetrievalQuery = {
      skip: req.body.offset,
      take: req.body.limit,
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

    //  transform allele_counts to allele_number and allele_count
    //  transform encoded values to human readable values
    const results2 = results.map((result) => {
      const { chr, allele_counts, ...rest } = result;
      // example allele_counts - phased: true
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

      // allele_number referes to total number of alleles observed for a particular variant across
      // all individuals in the sample population.
      const allele_number = allele_counts
        .filter((x) => x.v >= 0)
        .map((x) => x.count * 2)
        .reduce((total, x) => total + x, 0);

      // allele_count refers to total number of alleles observed for a
      // particular variant (the alt allele) across all individuals in the sample population.
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

router.post(
  '/filters',
  isPermittedTo('read'),
  validate(annotation_validators),
  asyncHandler(async (req, res, next) => {
    const filterQuery = buildFilterQuery(req.body);

    const cols = ['genes', 'cln_sig', 'func', 'exonic_func'];

    // find distinct values for each column given the filter
    const promises = cols.map((col) => prisma.variant_annotation.groupBy({
      where: {
        [col]: { not: { equals: null } },
        ...filterQuery,
      },
      by: [col],
      _count: true,
    }));

    const results = await Promise.all(promises);

    // transform results to object like [{ value1: count1, value2: count2 }, ... ]
    const results2 = results.map((result, idx) => result.reduce((acc, curr) => {
      const col = cols[idx];
      acc[curr[col]] = curr._count;
      return acc;
    }, {}));

    // [['col1', 'col2'], [res1, res2]] -> { col1: res1, col2: res2 }
    const filters = _.zipObject(cols, results2);

    // find min and max values for each numeric column given the filter
    // const minmax_result = await prisma.variant_annotation.aggregate({
    //   where: filterQuery,
    //   _min: numeric_cols.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}),
    //   _max: numeric_cols.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}),
    // });

    // .then((result) => {
    //   const { _min, _max } = result;
    //   const numeric_filters = numeric_cols.reduce((acc, curr) => {
    //     acc[curr] = { min: _min[curr], max: _max[curr] };
    //     return acc;
    //   }, {});
    //   res.json({ ...filters, ...numeric_filters });
    // });

    res.json(filters);
  }),
);

module.exports = router;
