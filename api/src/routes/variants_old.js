const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param } = require('express-validator');
const _ = require('lodash/fp');
const createError = require('http-errors');
const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const {
  standardize, RANGE_COLS, participants_with_variants, decode_chromosome,
  encode_chromosome, decode_genotype, ALLELE_STATS_COLS,
  queryVariantsWithAlleleStatsFilter, queryVariantsWithoutAlleleStatsFilter,
} = require('../services/variants_old');

const isPermittedTo = accessControl('variant');
const router = express.Router();
const prisma = new PrismaClient();

// const NUMERIC_COLS = ['cadd_phred', 'polyphen_max', 'revel_max', 'sift_max'];

function rangeToQuery(rangeQuery) {
  // convert { min: 1, max: 2 } to { gte: 1, lte: 2 }
  // if min or max is NaN, exclude that condition
  const ret = _.omitBy(_.isNaN)({
    gte: rangeQuery?.min,
    lte: rangeQuery?.max,
  });
  // if there are no keys, return null
  if (Object.keys(ret).length === 0) {
    return null;
  }
  return ret;
}

function jointFilterValidation(req, res, next) {
  // at least one of chromosome or gene must be provided
  if (!(req.body.chr || req.body.gene)) {
    next(createError(400, 'At least one of chromosome or gene must be provided'));
  }
  next();
}

function buildFilterQuery(_query) {
  // console.log(_query);
  const { start } = _query;
  const end = _query.end || start;

  const gene_filter = [];
  if (_query.gene) {
    gene_filter.push({ genes: { contains: _query.gene } });
  }
  if (_query.genes?.length) {
    gene_filter.push({ genes: { in: _query.genes } });
  }

  const numeric_filters = RANGE_COLS.reduce((acc, col) => {
    acc[col] = rangeToQuery(_query[col]);
    return acc;
  }, {});

  return _.omitBy(_.isNil)({
    source_id: _query.source_id,
    chr: _query.chr,
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
  if (!/^[ATCG]+$/i.test(nucleotide)) {
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
  body('snapshot_id').isInt().toInt(),
  body('chr').customSanitizer(encode_chromosome).optional(),
  body('start').isInt().toInt().optional(),
  body('end').isInt().toInt().optional(),
  body('ref').custom(isValidNucleotide).toUpperCase().optional(),
  body('alt').custom(isValidNucleotide).toUpperCase().optional(),

  body('func').isArray().optional(),
  body('genes').isArray().optional(),
  body('exonic_func').isArray().optional(),
  body('cln_sig').isArray().optional(),
  ...RANGE_COLS.map(rangeValidator),
];

function variant_id_sanitizer(variant_id) {
  if (variant_id.length !== 4) {
    throw createError(400, 'Invalid variant_id - length is not 4');
  }
  const chr = variant_id[0];
  const position = variant_id[1];
  const ref = variant_id[2];
  const alt = variant_id[3];

  // convert position to integer
  const pos_num = Number(position);
  if (Number.isNaN(pos_num)) {
    throw createError(400, 'Invalid variant_id - position is not a number');
  }

  if (!isValidNucleotide(ref) || !isValidNucleotide(alt)) {
    throw createError(400, 'Invalid variant_id - ref or alt nucleotide is invalid');
  }

  return [encode_chromosome(chr), pos_num, ref, alt];
}

router.post(
  '/',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    body('limit').default(100).isInt().toInt(),
    body('offset').default(0).isInt().toInt(),
  ]),
  jointFilterValidation,
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

router.post(
  '/new',
  isPermittedTo('read'),
  validate([
    ...annotation_validators,
    body('limit').default(100).isInt().toInt(),
    body('offset').default(0).isInt().toInt(),
  ]),
  jointFilterValidation,
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Variants']
    // #swagger.summary = 'Search variants'

    const canon_query = {
      ...standardize(req.body),
      limit: req.body.limit,
      offset: req.body.offset,
    };
    // eslint-disable-next-line no-console
    console.log({ canon_query });

    const hasAlleleStatsFilter = ALLELE_STATS_COLS
      .map((col) => _.has(col, canon_query))
      .some((x) => x);
    const results = await (hasAlleleStatsFilter
      ? queryVariantsWithAlleleStatsFilter(canon_query, req.user.username)
      : queryVariantsWithoutAlleleStatsFilter(canon_query, req.user.username));

    res.json(results);
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
  jointFilterValidation,
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
    //   _min: RANGE_COLS.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}),
    //   _max: RANGE_COLS.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}),
    // });

    // .then((result) => {
    //   const { _min, _max } = result;
    //   const numeric_filters = RANGE_COLS.reduce((acc, curr) => {
    //     acc[curr] = { min: _min[curr], max: _max[curr] };
    //     return acc;
    //   }, {});
    //   res.json({ ...filters, ...numeric_filters });
    // });

    res.json(filters);
  }),
);

router.post(
  '/participant-count',
  isPermittedTo('read'),
  validate([
    body('variant_ids').isArray().customSanitizer((xs) => xs.map(variant_id_sanitizer)),
    body('source_id').isInt().toInt(),
    body('snapshot_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    const { variant_ids, source_id, snapshot_id } = req.body;
    if (!variant_ids?.length) {
      return res.json({ count: 0 });
    }
    const count = await participants_with_variants({
      variant_ids,
      source_id,
      snapshot_id,
      username: req.user.username,
      return_count: true,
    });
    res.json({ count });
  }),
);

router.post(
  '/cohorts',
  validate([
    body('variant_ids').isArray().customSanitizer((xs) => xs.map(variant_id_sanitizer)),
    body('source_id').isInt().toInt(),
    body('snapshot_id').isInt().toInt(),
    body('name').isString().notEmpty(),
    body('is_published').optional().isBoolean(),
    body('is_locked').optional().isBoolean(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res, next) => {
    const { variant_ids, source_id, snapshot_id } = req.body;
    if (!variant_ids?.length) {
      return res.json({ count: 0 });
    }
    const participants = await participants_with_variants({
      variant_ids,
      source_id,
      snapshot_id,
      username: req.user.username,
    });

    const cohort_data = _.flow([
      _.pick(['name', 'is_published', 'description', 'metadata']),
      _.omitBy(_.isNil),
    ])(req.body);
    cohort_data.query = {
      name: 'genotype',
      namespace: 'edu.iu.sca.biobank',
      version: '1.0.0',
      query: {},
    };
    cohort_data.metadata = {
      ...cohort_data.metadata,
      variant_search: {
        source_id,
        snapshot_id,
      },
    };

    const cohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        author_username: req.user.username,
        participants,
      },
      select: {
        id: true,
      },
    });
    res.json(cohort);
  }),
);

router.patch(
  '/cohort/:id',
  isPermittedTo('create'),
  validate([
    param('id').isInt().toInt(),
    body('variant_ids').isArray().customSanitizer((xs) => xs.map(variant_id_sanitizer)),
    body('source_id').isInt().toInt(),
    body('snapshot_id').isInt().toInt(),
    body('name').optional().isString().notEmpty(),
    body('published').optional().isBoolean(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res, next) => {
    const { variant_ids, source_id, snapshot_id } = req.body;
    if (!variant_ids?.length) {
      return res.json({ count: 0 });
    }
    const participants = await participants_with_variants({
      variant_ids,
      source_id,
      snapshot_id,
      username: req.user.username,
    });

    const cohortToUpdate = await prisma.cohort.findUniqueOrThrow({
      where: {
        id: req.params.id,
      },
    });

    const cohort_data = _.pick(['name', 'published', 'description', 'metadata'])(req.body);

    cohort_data.metadata = _.merge(cohortToUpdate.metadata, {
      variant_search: {
        source_id,
        snapshot_id,
      },
    });

    cohort_data.query = {
      name: 'genotype',
      namespace: 'edu.iu.sca.biobank',
      version: '1.0.0',
      query: {},
    };

    const cohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        author_username: req.user.username,
        participants,
      },
      select: {
        id: true,
      },
    });
    res.json(cohort);
  }),
);

module.exports = router;
