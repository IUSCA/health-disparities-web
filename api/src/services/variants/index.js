const { Prisma, PrismaClient } = require('@prisma/client');
const config = require('config');
const { SQL_OP_MAP, isUnaryOp } = require('../cohorts/common');
const { histogramSQL } = require('../queries');

const prisma = new PrismaClient();

function mergeIntervals(intervals) {
  // merge overlapping intervals
  // intervals is array of 2-tuples [[start, end], [start, end], ...]
  // intervals are assumed to be sorted by start and then end
  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i += 1) {
    const last = merged[merged.length - 1];

    // if the current interval starts on or before the last interval ends, merge them
    if (intervals[i][0] <= last[1]) {
      // merge the intervals
      // set the end of the last interval to the max of the two ends
      last[1] = Math.max(last[1], intervals[i][1]);
    } else {
      merged.push(intervals[i]);
    }
  }
  return merged;
}

async function getDistinctRangesFromGene(gene_name, build) {
  const rows = await prisma.$queryRaw`
    select distinct chr, "txStart" as start, "txEnd" as end 
    from "ncbiRefSeqCurated" nrsc 
    where upper(name2) = upper(${gene_name}) and build = ${build}
    order by chr, "txStart", "txEnd"
  `;
  return rows.map((row) => ({
    chr: row.chr,
    start: parseInt(row.start, 10),
    end: parseInt(row.end, 10),
  }));
}

async function getGeneRegions(gene_name, build) {
  // get distinct ranges for the gene by looking up the gene in the ncbiRefSeqCurated table
  // returns [{chr, start, end}, ...]

  const ranges = await getDistinctRangesFromGene(gene_name, build);

  // group by chr
  const chr_ranges = {};
  ranges.forEach((row) => {
    if (!chr_ranges[row.chr]) {
      chr_ranges[row.chr] = [];
    }
    chr_ranges[row.chr].push([row.start, row.end]);
  });

  // for each chr, merge overlapping intervals
  const chr_ranges_merged = {};
  Object.entries(chr_ranges).forEach(([chr, intervals]) => {
    chr_ranges_merged[chr] = mergeIntervals(intervals);
  });

  // flatten the merged intervals per chromosome into a list of ranges
  return Object.entries(chr_ranges_merged)
    .map(
      ([chr, merged_intervals]) => merged_intervals
        .map(
          (interval) => ({
            chr: parseInt(chr, 10),
            start: interval[0] - config.get('variant_search.gene.left_padding'),
            end: interval[1] + config.get('variant_search.gene.right_padding'),
          }),
        ),
    ).flat();
}

async function transformRanges(ranges, build) {
  return Promise.all(
    ranges.map(async (range) => {
      if (range.type === 'gene') {
        const regions = await getGeneRegions(range.value.name, build);
        return {
          ...range,
          value: {
            ...range.value,
            regions,
          },
        };
      }
      return range;
    }),
  );
}

function geneSQLFilter(regions) {
  // convert ranges to SQL
  const region_sqls = regions
    .map(
      (r) => Prisma.sql`(chr = ${r.chr} AND position BETWEEN ${r.start} AND ${r.end})`,
    );

  if (region_sqls.length === 0) {
    return null;
  }

  // join the ranges with OR
  return Prisma.join(region_sqls, ' OR ');
}

function buildRangesSQL(ranges) {
  const range_sqls = ranges.map((range) => {
    if (range.type === 'gene') {
      // can return null if gene is not found
      return geneSQLFilter(range.value.regions);
    }
    if (range.type === 'region') {
      return Prisma.sql`(chr = ${range.value.chr} AND position BETWEEN ${range.value.start} AND ${range.value.end})`;
    }
    // variant
    // eslint-disable-next-line max-len
    return Prisma.sql`(chr = ${range.value.chr} AND position = ${range.value.position} AND ref = ${range.value.ref} AND alt = ${range.value.alt})`;
  }).filter((r) => r != null);

  if (range_sqls.length === 0) {
    return null;
  }

  return Prisma.join(range_sqls, ' OR  ');
}

function buildBaseQuerySQL({
  source_id, snapshot_id, protocol_id, ranges,
}) {
  const rangesSql = buildRangesSQL(ranges);

  // if no ranges, query should return no results
  const _rangesSql = rangesSql == null ? Prisma.sql`false` : rangesSql;

  return Prisma.sql`
    source_id = ${source_id}
    AND snapshot_id = ${snapshot_id}
    AND protocol_id = ${protocol_id}
    AND (${_rangesSql})
  `;
}

function buildField(field, op, value) {
  const sql_op = Prisma.raw(SQL_OP_MAP[op]);
  let sql_value = value;
  if (op === 'in' || op === 'not_in') {
    sql_value = Prisma.sql`(${Prisma.join(value)})`;
  }
  if (op === 'contains' || op === 'not_contains') {
    sql_value = Prisma.sql`${`%${value}%`}`;
  }
  if (op === 'starts_with') {
    sql_value = Prisma.sql`${`%${value}`}`;
  }
  if (op === 'ends_with') {
    sql_value = Prisma.sql`${`${value}%`}`;
  }
  if (isUnaryOp(op)) {
    sql_value = Prisma.empty;
  }
  const _field = field.split('.')[1];
  const field_sql = Prisma.raw(_field);
  return Prisma.sql`${field_sql} ${sql_op} ${sql_value}`;
}

function buildFilters(queryJson) {
  // console.log({ queryJson });
  const { operator, children } = queryJson;
  if (children) {
    if (children.length === 0) {
      return Prisma.empty;
    }
    // non-leaf node
    let negation = Prisma.empty;
    let _operator = operator;
    if (operator === 'NOT_AND') {
      negation = Prisma.raw('NOT');
      _operator = 'AND';
    }
    if (operator === 'NOT_OR') {
      negation = Prisma.raw('NOT');
      _operator = 'OR';
    }
    const query = Prisma.join(children.map((child) => buildFilters(child)), ` ${_operator} `);
    return Prisma.sql`${negation}(${query})`;
  }

  // leaf node
  const {
    field, operator: op, value,
  } = queryJson;
  return buildField(field, op, value);
}

function buildSQL({
  base_query, json_query, limit, offset, count = false,
}) {
  const base_query_sql = buildBaseQuerySQL(base_query);

  const json_query_sql = buildFilters(json_query);
  // console.log(json_query_sql.sql, json_query_sql.values);

  const select = Prisma.raw(count ? 'COUNT(*) as count' : '*');
  const where = json_query_sql === Prisma.empty
    ? Prisma.sql`WHERE (${base_query_sql})`
    : Prisma.sql`WHERE (${base_query_sql}) AND (${json_query_sql})`;
  const query = Prisma.sql`WITH results AS (
      SELECT ${select}
      FROM gt_stats_annotations
      ${where}
    )
    select *, count(*) over () as total_count
    from results
    ORDER BY "chr", "position", "ref", "alt" ASC 
    LIMIT ${limit}
    OFFSET ${offset};
  `;
  return query;
}

function buildTotalCountSQL(base_query) {
  const base_query_sql = buildBaseQuerySQL(base_query);

  const query = Prisma.sql`
    SELECT COUNT(*) as count
    FROM gt_stats_annotations
    WHERE (${base_query_sql})
  `;
  return query;
}

function buildSQLVarIds({
  base_query, json_query,
}) {
  const base_query_sql = buildBaseQuerySQL(base_query);

  const json_query_sql = buildFilters(json_query);
  // console.log(json_query_sql.sql, json_query_sql.values);

  const where = json_query_sql === Prisma.empty
    ? Prisma.sql`WHERE (${base_query_sql})`
    : Prisma.sql`WHERE (${base_query_sql}) AND (${json_query_sql})`;
  const query = Prisma.sql`
      SELECT chr, position, ref, alt, source_id
      FROM gt_stats_annotations
      ${where}
  `;
  return query;
}

function annotationHistogramSQL(query, _column, _num_bins) {
  const histSQL = histogramSQL('data', _column, _num_bins);
  return Prisma.sql`
  with data as (
    select * from gt_stats_annotations
    WHERE ${query}
  )
  ${histSQL}
  `;
}

async function participantsWithVariants({
  variants_sql,
  zygosities,
  snapshot_id,
  username,
  return_count = false,
}) {
  // compute required data in stages with CTEs
  // 1. relevant variants - variants that match the input filters
  // 2. gt - genotype indexes of participants with the required zygosities in the relevant variants
  // 3. permissible_participants - participants that are in the snapshot and accessible to the user
  // through protocols
  // 4. select - intersection of permissible_participants and participants matching gt indexes
  // This query is superior to the previous one in terms of performance, because it avoids
  // large intermediate join results. The query planner is not able to optimize the previous query.
  const select_column = return_count
    ? Prisma.raw('count(distinct p.id) as count')
    : Prisma.raw('distinct p.id as pid');
  const query = Prisma.sql`
    with 
      relevant_variants as (
        ${variants_sql}
      ),
      gt as (
        select
          distinct t.idx as idx
        from
          variant v
          join relevant_variants rv on 
                v.chr = rv.chr
            and v."position" = rv.position
            and v."ref" = rv.ref
            and v.alt = rv.alt
            and v.source_id = rv.source_id
          join unnest(v.genotype) WITH ordinality t(g, idx) on t.g in (${Prisma.join(zygosities, ',')})
      ),
      permissible_participants as (
        select p.id, pg.genotype_idx
        from participant p 
        join participants_per_snapshot pps on pps.id = p.id and pps.snapshot_id = ${snapshot_id}
        join participants_per_user ppu on ppu.id = p.id and ppu.username = ${username}
        join participant_genotype pg on pg.participant_id = p.id
      )
    select
    ${select_column}
    FROM permissible_participants p 
    WHERE EXISTS (
      SELECT 1 FROM gt WHERE p.genotype_idx = gt.idx
    )
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
  buildSQL,
  annotationHistogramSQL,
  buildBaseQuerySQL,
  participantsWithVariants,
  buildRangesSQL,
  // buildRangesPrismaQuery,
  buildSQLVarIds,
  getDistinctRangesFromGene,
  getGeneRegions,
  transformRanges,
  buildTotalCountSQL,
};
