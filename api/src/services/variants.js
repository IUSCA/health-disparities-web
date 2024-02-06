const _ = require('lodash/fp');
const { PrismaClient, Prisma } = require('@prisma/client');
const createError = require('http-errors');

const prisma = new PrismaClient();

const ALLELE_STATS_COLS = ['missing', 'c0', 'c1', 'c2', 'c3', 'allele_number', 'allele_count', 'allele_frequency'];
const RANGE_COLS = [
  'cadd_phred', 'polyphen_max', 'revel_max', 'sift_max',
  'af_afr', 'af_amr', 'af_asj', 'af_eas', 'af_fin', 'af_nfe', 'af_oth', 'af_sas',
  ...ALLELE_STATS_COLS,
];
const INCLUDES_COLS = ['cln_sig', 'func', 'exonic_func'];

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

function standardize(query) {
  const { start } = query;
  const end = query.end || start;

  const num_queries = RANGE_COLS.reduce((acc, col) => {
    if (!query[col]) return acc;
    const { min, max } = query[col];
    const obj = _.omitBy(_.isNil)({
      min: _.isFinite(min) ? min : null,
      max: _.isFinite(max) ? max : null,
    });
    acc[col] = Object.keys(obj).length === 0 ? null : obj;
    return acc;
  }, {});

  const include_queries = INCLUDES_COLS.reduce((acc, col) => {
    acc[col] = query[col]?.length ? query[col] : null;
    return acc;
  }, {});

  const canon_query = _.omitBy(_.isNil)({
    chr: query.chr,
    gene: query.gene,
    genes: query.genes?.length ? query.genes : null,
    start,
    end,
    source_id: query.source_id,
    snapshot_id: query.snapshot_id,
    ref: query.ref,
    alt: query.alt,
    ...num_queries,
    ...include_queries,
  });

  return canon_query;
}

function buildSQLFilterQuery(_query) {
  // gene filter
  // if gene is provided, use it as equals filter
  // if genes is provided, use it as includes filter
  const gene_filter = [];
  if (_query.gene) {
    gene_filter.push(Prisma.sql`genes ILIKE ${`%${_query.gene}%`}`);
  }
  if (_query.genes?.length) {
    gene_filter.push(Prisma.sql`genes in (${Prisma.join(_query.genes)})`);
  }

  let position_query = null;
  if (_.isFinite(_query.start) && _.isFinite(_query.end)) {
    // start and end are both valid numbers
    position_query = Prisma.sql`v.position >= ${_query.start} AND v.position <= ${_query.end}`;
  } else if (_.isFinite(_query.start) || _.isFinite(_query.end)) {
    position_query = Prisma.sql`v.position = ${_query.start || _query.end}`;
  }

  const equal_queries = [
    _query.chr ? Prisma.sql`v.chr = ${_query.chr}` : null,
    _query.source_id ? Prisma.sql`source_id = ${_query.source_id}` : null,
    _query.ref ? Prisma.sql`v.ref = ${_query.ref}` : null,
    _query.alt ? Prisma.sql`v.alt = ${_query.alt}` : null,
  ];

  const range_queries = RANGE_COLS.flatMap((col) => ([
    _.isFinite(_query[col]?.min) ? Prisma.sql`${Prisma.raw(col)} >= ${_query[col].min}` : null,
    _.isFinite(_query[col]?.max) ? Prisma.sql`${Prisma.raw(col)} <= ${_query[col].max}` : null,
  ]));

  const include_queries = INCLUDES_COLS.map((col) => (_query[col]?.length ? Prisma.sql`${Prisma.raw(col)} in (${Prisma.join(_query[col])})` : null));

  return Prisma.join([
    position_query,
    ...equal_queries,
    ...include_queries,
    ...range_queries,
    ...gene_filter,
  ].filter((x) => x != null), ' AND ');
}

async function queryVariantsWithAlleleStatsFilter(_query, username) {
  const whereQuery = buildSQLFilterQuery(_query);

  const sqlQuery = Prisma.sql`
  with
  indexes as (
    select
      distinct p.genotype_idx as id
    from
      participant p
    join participants_per_snapshot ps on
      ps.id = p.id
    join participants_per_user ppu on
      ppu.id = p.id
    where
      p.genotype_idx is not null
      ps.snapshot_id = ${_query.snapshot_id} 
      and ppu.username = ${username}
  ),
  results as (
  SELECT 
    v."chr", v."position", v."ref", v."alt", v.source_id, v.phase, 
    a.func, a.genes, a.exonic_func, a.aa_change, a.af_afr, a.af_sas, a.af_amr, a.af_eas, a.af_nfe, a.af_fin, a.af_asj, a.af_oth, a.cln_allele_id, a.cln_cond, a.cln_dis_db, a.cln_rev_stat, a.cln_sig, a.cadd_phred, a.polyphen_max, a.revel_max, a.sift_max,
    ac.*, ac2.*, ac3.*
  from
    variant v
    left join annotation a on
      v."chr" = a."chr"
      and v."position" = a."position"
      and v."ref" = a."ref"
      and v.alt = a.alt
  cross join LATERAL (
    select
      COUNT(CASE WHEN g = -1 THEN 1 END) AS missing,
        COUNT(CASE WHEN g = 0 THEN 1 END) AS c0,
        COUNT(CASE WHEN g = 1 THEN 1 END) AS c1,
        COUNT(CASE WHEN g = 2 THEN 1 END) AS c2,
        COUNT(CASE WHEN g = 3 THEN 1 END) AS c3
    FROM
      unnest(v.genotype) with ordinality t(g,idx)
      WHERE g IS NOT null
        and idx IN (SELECT id FROM indexes)
  ) AS ac
  cross join lateral (
    select 2*(ac.c0 + ac.c1 + ac.c2 + ac.c3) as allele_number,
    case 
    when v.phase = false then
      (ac.c1 + 2*ac.c2) 
    when v.phase = true then
      (ac.c1 + ac.c2 + 2*ac.c3)
  end as allele_count
  ) as ac2
  cross join lateral (
    select ac2.allele_count::float/ coalesce(nullif(ac2.allele_number,0), 1) as allele_frequency
  ) as ac3
  WHERE ${whereQuery})
  select *, count(*) over() as total_count
  from results
  order by "chr", "position", "ref", "alt"
  offset ${_query.offset} limit ${_query.limit}
  `;

  // eslint-disable-next-line no-console
  console.log(sqlQuery.sql, sqlQuery.values);

  const results = (await prisma.$queryRaw(sqlQuery)) ?? [];
  return {
    metadata: { count: Number(results[0]?.total_count ?? 0) },
    results: results.map((result) => {
      // eslint-disable-next-line no-unused-vars
      const { chr, total_count, ...rest } = result;
      return {
        ...rest,
        chr: decode_chromosome(chr),
      };
    }),
  };
}

async function queryVariantsWithoutAlleleStatsFilter(_query, username) {
  const whereQuery = buildSQLFilterQuery(_query);

  const results_query = Prisma.sql`
  with
  indexes as (
    select
      distinct p.genotype_idx as id
    from
      participant p
    join participants_per_snapshot ps on
      ps.id = p.id
    join participants_per_user ppu on
      ppu.id = p.id
    where
      p.genotype_idx is not null
      and ps.snapshot_id = ${_query.snapshot_id} 
      and ppu.username = ${username}
  )
  SELECT 
    v."chr", v."position", v."ref", v."alt", v.source_id, v.phase, 
    a.func, a.genes, a.exonic_func, a.aa_change, a.af_afr, a.af_sas, a.af_amr, a.af_eas, a.af_nfe, a.af_fin, a.af_asj, a.af_oth, a.cln_allele_id, a.cln_cond, a.cln_dis_db, a.cln_rev_stat, a.cln_sig, a.cadd_phred, a.polyphen_max, a.revel_max, a.sift_max,
    ac.*, ac2.*, ac3.*
  from
    variant v
    left join annotation a on
      v."chr" = a."chr"
      and v."position" = a."position"
      and v."ref" = a."ref"
      and v.alt = a.alt
  cross join LATERAL (
    select
      COUNT(CASE WHEN g = -1 THEN 1 END) AS missing,
        COUNT(CASE WHEN g = 0 THEN 1 END) AS c0,
        COUNT(CASE WHEN g = 1 THEN 1 END) AS c1,
        COUNT(CASE WHEN g = 2 THEN 1 END) AS c2,
        COUNT(CASE WHEN g = 3 THEN 1 END) AS c3
    FROM
      unnest(v.genotype) with ordinality t(g,idx)
      WHERE g IS NOT null
        and idx IN (SELECT id FROM indexes)
  ) AS ac
  cross join lateral (
    select 2*(ac.c0 + ac.c1 + ac.c2 + ac.c3) as allele_number,
    case 
    when v.phase = false then
      (ac.c1 + 2*ac.c2) 
    when v.phase = true then
      (ac.c1 + ac.c2 + 2*ac.c3)
  end as allele_count
  ) as ac2
  cross join lateral (
    select ac2.allele_count::float/ coalesce(nullif(ac2.allele_number,0), 1) as allele_frequency
  ) as ac3
  
  WHERE ${whereQuery}
  order by "chr", "position", "ref", "alt"
  offset ${_query.offset} limit ${_query.limit}
  `;

  // eslint-disable-next-line no-console
  console.log(results_query.sql, results_query.values);

  const count_query = Prisma.sql`
  SELECT 
    count(*)
  FROM
    variant v
    left join annotation a on
      v."chr" = a."chr"
      and v."position" = a."position"
      and v."ref" = a."ref"
      and v.alt = a.alt
  WHERE ${whereQuery}`;

  // eslint-disable-next-line no-console
  console.log(count_query.sql, count_query.values);

  const p1 = prisma.$queryRaw(results_query);
  const p2 = prisma.$queryRaw(count_query);

  const [results, count_rows] = await Promise.all([p1, p2]);
  return {
    metadata: { count: Number(count_rows[0]?.count ?? 0) },
    results: results.map((result) => ({
      ...result,
      chr: decode_chromosome(result.chr),
    })),
  };
}

async function participants_with_variants({
  variant_ids, source_id, snapshot_id, username, return_count = false,
}) {
  const variant_id_sql = variant_ids.map(([chr, pos, ref, alt]) => Prisma.sql`(${chr}, ${pos}, ${ref}, ${alt})`);
  const select_column = return_count
    ? Prisma.raw('count(distinct p.id) as count')
    : Prisma.raw('distinct p.id as pid');
  const query = Prisma.sql`
    select 
    ${select_column}
    from variant v
    join unnest(v.genotype) WITH ordinality t(g, idx) on g > 0
    join participant p on p.genotype_idx = idx
    join participants_per_user ppu on ppu.id = p.id
    join participants_per_snapshot pps on pps.id = p.id
    where source_id = ${source_id}
    and ("chr", "position", "ref", "alt") in (${Prisma.join(variant_id_sql, ',')})
    and snapshot_id = ${snapshot_id}
    and username = ${username}
  `;

  // eslint-disable-next-line no-console
  console.log(query.sql, query.values);

  const rows = await prisma.$queryRaw(query);
  if (return_count) {
    return rows[0].count;
  }
  return rows.map((row) => row.pid);
}

module.exports = {
  standardize,
  RANGE_COLS,
  INCLUDES_COLS,
  ALLELE_STATS_COLS,
  queryVariantsWithAlleleStatsFilter,
  queryVariantsWithoutAlleleStatsFilter,
  participants_with_variants,
  decode_chromosome,
  encode_chromosome,
  decode_genotype,
};
