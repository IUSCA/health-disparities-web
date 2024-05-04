const { Prisma, PrismaClient } = require('@prisma/client');
const { SQL_OP_MAP, isUnaryOp } = require('../cohort/participants');

const prisma = new PrismaClient();

function buildRangesSQL(ranges) {
  const t = ranges.map((range) => {
    if (range.type === 'gene') {
      return Prisma.sql`(gene1_id = ${range.value.id} or gene2_id = ${range.value.id})`;
    }
    if (range.type === 'region') {
      return Prisma.sql`(chr = ${range.value.chr} AND position BETWEEN ${range.value.start} AND ${range.value.end})`;
    }
    // variant
    return Prisma.sql`(chr = ${range.value.chr} AND position = ${range.value.position} AND ref = ${range.value.ref} AND alt = ${range.value.alt})`;
  });
  return Prisma.join(t, ' OR  ');
}

function buildRangesPrismaQuery(ranges) {
  const t = ranges.map((range) => {
    if (range.type === 'gene') {
      return {
        OR: [
          {
            gene1_id: range.value.id,
          },
          {
            gene2_id: range.value.id,
          },
        ],
      };
    }
    if (range.type === 'region') {
      return {
        chr: range.value.chr,
        position: {
          gte: range.value.start,
          lte: range.value.end,
        },
      };
    }
    // variant
    return {
      chr: range.value.chr,
      position: range.value.position,
      ref: range.value.ref,
      alt: range.value.alt,
    };
  });
  return {
    OR: t,
  };
}

function buildBaseQuerySQL({
  source_id, snapshot_id, protocol_id, ranges,
}) {
  const rangesSql = buildRangesSQL(ranges);
  return Prisma.sql`
    source_id = ${source_id}
    AND snapshot_id = ${snapshot_id}
    AND protocol_id = ${protocol_id}
    AND (${rangesSql})
  `;
}

function buildField(field, op, value, func = null) {
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
  const field_sql = func != null ? Prisma.raw(`${func}(${field})`) : Prisma.raw(field);
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
    function: func, field, operator: op, value,
  } = queryJson;
  return buildField(field, op, value, func);
}

function buildSQL({
  base_query, json_query, limit, offset, count = false,
}) {
  const base_query_sql = buildBaseQuerySQL(base_query);

  const json_query_sql = json_query != null ? buildFilters(json_query.criteria) : null;
  // console.log(json_query_sql.sql, json_query_sql.values);

  const select = Prisma.raw(count ? 'COUNT(*) as count' : '*');
  const where = json_query_sql != null
    ? Prisma.sql`WHERE (${base_query_sql}) AND (${json_query_sql})`
    : Prisma.sql`WHERE (${base_query_sql})`;
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

function histogramSQL(_table, _column, _num_bins) {
  const table = Prisma.raw(_table);
  const column = Prisma.raw(_column);
  const num_bins = Prisma.raw(_num_bins);

  const sql = Prisma.sql`SELECT
      width_bucket(${column}, min_value, max_value, ${num_bins}) AS bin_number,
      min_value + ((max_value - min_value) / ${num_bins}) * (width_bucket(${column}, min_value, max_value, ${num_bins}) - 1) AS bin_start,
      min_value + ((max_value - min_value) / ${num_bins}) * width_bucket(${column}, min_value, max_value, ${num_bins}) AS bin_end,
      count(*)::int AS bin_count
    FROM
      ${table},
      (SELECT MIN(${column}) AS min_value, MAX(${column}) AS max_value FROM ${table}) AS range_values
    GROUP BY
      bin_number, bin_start, bin_end
    ORDER BY
      bin_number;
  `;
  return sql;
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
  variant_ids,
  zygosities,
  snapshot_id,
  username,
  return_count = false,
}) {
  const variant_id_sql = variant_ids.map(
    ([chr, pos, ref, alt, source_id]) => Prisma.sql`(${chr}, ${pos}, ${ref}, ${alt}, ${source_id})`,
  );
  const select_column = return_count
    ? Prisma.raw('count(distinct p.id) as count')
    : Prisma.raw('distinct p.id as pid');
  const query = Prisma.sql`
    select 
    ${select_column}
    from variant v
    join unnest(v.genotype) WITH ordinality t(g, idx) on 1=1
    join participant p on p.genotype_idx = idx
    join participants_per_user ppu on ppu.id = p.id
    join participants_per_snapshot pps on pps.id = p.id
    and ("chr", "position", "ref", "alt", "source_id") in (${Prisma.join(variant_id_sql, ',')})
    and snapshot_id = ${snapshot_id}
    and username = ${username}
    and t.g in (${Prisma.join(zygosities, ',')})
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
  buildRangesPrismaQuery,
};
