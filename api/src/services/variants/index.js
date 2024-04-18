const { Prisma } = require('@prisma/client');
const { SQL_OP_MAP, isUnaryOp } = require('../cohort/participants');

function buildBaseQuerySQL(base_query) {
  return Prisma.sql`
    source_id = ${base_query.source_id}
    AND snapshot_id = ${base_query.snapshot_id}
    AND protocol_id = ${base_query.protocol_id}
    AND chr = ${base_query.chr}
    AND position >= ${base_query.position.gte}
    AND position <= ${base_query.position.lte}
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

  const json_query_sql = buildFilters(json_query.criteria);
  // console.log(json_query_sql.sql, json_query_sql.values);

  const select = Prisma.raw(count ? 'COUNT(*) as count' : '*');
  const query = Prisma.sql`WITH results AS (
      SELECT ${select}
      FROM gt_stats_annotations
      WHERE (${base_query_sql}) 
      AND (
        ${json_query_sql}
      )
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

module.exports = {
  buildSQL,
  annotationHistogramSQL,
  buildBaseQuerySQL,
};
