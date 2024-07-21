const { Prisma } = require('@prisma/client');
const { getGeneRegions, geneFilterSQL } = require('./genes');
const { SQL_OP_MAP, isUnaryOp } = require('../common');

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

function buildRangesSQL(ranges) {
  const range_sqls = ranges.map((range) => {
    if (range.type === 'gene') {
      // can return null if gene is not found
      return geneFilterSQL(range.value.regions);
    }
    if (range.type === 'region') {
      return Prisma.sql`(chr = ${range.value.chr} AND position BETWEEN ${range.value.start} AND ${range.value.end})`;
    }
    // variant
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

function participantsWithVariantsSQL({
  variants_sql,
  zygosities,
  snapshot_id,
  username,
  count = false,
}) {
  // compute required data in stages with CTEs
  // 1. relevant variants - variants that match the input filters
  // 2. gt - genotype indexes of participants with the required zygosities in the relevant variants
  // 3. permissible_participants - participants that are in the snapshot and accessible to the user
  // through protocols
  // 4. select - intersection of permissible_participants and participants matching gt indexes
  // This query is superior to the previous one in terms of performance, because it avoids
  // large intermediate join results. The query planner is not able to optimize the previous query.
  const select_column = count
    ? Prisma.raw('count(distinct p.id) as count')
    : Prisma.raw('distinct p.id as participant_id');
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
        select p.id, p.genotype_idx
        from participant p 
        join participants_per_snapshot pps on pps.id = p.id and pps.snapshot_id = ${snapshot_id}
        join participants_per_user ppu on ppu.id = p.id and ppu.username = ${username}
        where p.genotype_idx is not null  
      )
    select
    ${select_column}
    FROM permissible_participants p 
    WHERE EXISTS (
      SELECT 1 FROM gt WHERE p.genotype_idx = gt.idx
    )
  `;

  return query;
}

async function buildParticipantsQuery(body, protocol_id, username, { count = false } = {}) {
  const {
    source_id, snapshot_id, ranges, filters, zygosities,
  } = body;
  const resolvedRanges = await transformRanges(ranges, 'hg38');
  const base_query = {
    source_id,
    snapshot_id,
    protocol_id,
    ranges: resolvedRanges,
  };

  const variants_sql = buildSQLVarIds({
    base_query,
    json_query: filters,
  });

  participantsWithVariantsSQL({
    variants_sql,
    zygosities,
    snapshot_id,
    username,
    count,
  });
}

module.exports = {
  buildParticipantsQuery,
};
