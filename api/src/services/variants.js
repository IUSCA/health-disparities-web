const _ = require('lodash/fp');
const { Prisma } = require('@prisma/client');

const RANGE_COLS = [
  'cadd_phred', 'polyphen_max', 'revel_max', 'sift_max',
  'missing', 'c0', 'c1', 'c2', 'c3', 'allele_number', 'allele_count', 'allele_frequency',
  'af_afr', 'af_amr', 'af_asj', 'af_eas', 'af_fin', 'af_nfe', 'af_oth', 'af_sas',
];
const INCLUDES_COLS = ['cln_sig', 'func', 'exonic_func'];

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

function buildSQLQuery(_query, username) {
  const whereQuery = buildSQLFilterQuery(_query);

  return Prisma.sql`
  with
  indexes as (
    select pu.id
    from
      participants_per_user pu
      join  participants_per_snapshot ps on ps.id = pu.id
    where ps.snapshot_id = ${_query.snapshot_id} 
    and pu.username = ${username}
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
      and v.alt = a.alt,
  LATERAL (
    select
      COUNT(CASE WHEN g = -1 THEN 1 END) AS missing,
        COUNT(CASE WHEN g = 0 THEN 1 END) AS c0,
        COUNT(CASE WHEN g = 1 THEN 1 END) AS c1,
        COUNT(CASE WHEN g = 2 THEN 1 END) AS c2,
        COUNT(CASE WHEN g = 3 THEN 1 END) AS c3
    FROM
        unnest(v.genotype) with ordinality t(g,idx)
        join indexes i on i.id = t.idx
    WHERE g IS NOT NULL
  ) AS ac,
  
  lateral (
    select 2*(ac.c0 + ac.c1 + ac.c2 + ac.c3) as allele_number,
    case 
    when v.phase = false then
      (ac.c1 + 2*ac.c2) 
    when v.phase = true then
      (ac.c1 + ac.c2 + 2*ac.c3)
  end as allele_count
  ) as ac2,
  
  lateral (
    select ac2.allele_count::float/ coalesce(nullif(ac2.allele_number,0), 1) as allele_frequency
  ) as ac3
  
  WHERE ${whereQuery})
  select *, count(*) over() as total_count
  from results
  order by "chr", "position", "ref", "alt"
  offset ${_query.offset} limit ${_query.limit}
  `;
}

module.exports = {
  standardize,
  RANGE_COLS,
  INCLUDES_COLS,
  buildSQLFilterQuery,
  buildSQLQuery,
};
