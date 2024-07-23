const { Prisma } = require('@prisma/client');
const { histogramSQL } = require('../../queries');
const { transformRanges, buildRangesSQL } = require('./ranges');
const { buildFiltersSQL } = require('./filters');

/**
 * Builds the base SQL filter for querying genotype data based on the provided parameters.
 *
 * @param {Object} options - The options for building the query.
 * @param {number} options.source_id - The source ID.
 * @param {number} options.snapshot_id - The snapshot ID.
 * @param {number} options.protocol_id - The protocol ID.
 * @param {Array} options.ranges - The ranges for the query.
 * @returns {Prisma.sql} The base SQL query.
 */
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

/**
 * Builds and returns a SQL query for retrieving variant IDs based on the provided parameters.
 * A variant ID is a tuple of chr, position, ref, alt, source_id
 *
 * @param {Object} options - The options for building the SQL query.
 * @param {string} options.base_query - The base query made from ranges.
 * @param {Object} options.filters - The filter tree object to apply.
 * @returns {Object} The SQL query for retrieving genotype data.
 */
function searchVariantIDsSQL({
  base_query, filters,
}) {
  const base_query_sql = buildBaseQuerySQL(base_query);

  const filters_sql = buildFiltersSQL(filters);
  // console.log(filters_sql.sql, filters_sql.values);

  const where = filters_sql === Prisma.empty
    ? Prisma.sql`WHERE (${base_query_sql})`
    : Prisma.sql`WHERE (${base_query_sql}) AND (${filters_sql})`;
  const query = Prisma.sql`
      SELECT chr, position, ref, alt, source_id
      FROM gt_stats_annotations
      ${where}
  `;
  return query;
}

/**
 * Constructs a SQL query for searching genotype data.
 * Queries the gt_stats_annotations table
 * Query returns the pagination data and the total count of results.
 * The total count is returned in the 'total_count' column which is the same for all rows.
 *
 *
 * @param {Object} options - The options for constructing the query.
 * @param {string} options.base_query - The base query object.
 * @param {Object} options.filters - The filters to apply.
 * @param {number} options.limit - The maximum number of results to return.
 * @param {number} options.offset - The number of results to skip.
 * @returns {string} The constructed SQL query.
 */
function searchGenotypeDataSQL({
  base_query, filters, limit, offset,
}) {
  const base_query_sql = buildBaseQuerySQL(base_query);

  const filters_sql = buildFiltersSQL(filters);
  // console.log(filters_sql.sql, filters_sql.values);

  const where = filters_sql === Prisma.empty
    ? Prisma.sql`WHERE (${base_query_sql})`
    : Prisma.sql`WHERE (${base_query_sql}) AND (${filters_sql})`;
  const query = Prisma.sql`WITH results AS (
      SELECT *
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

/**
 * Builds a query to retrieve participants based on the provided parameters.
 *
 * @param {Object} body - The cohort query body containing the query parameters.
 * @param {string} protocol_id - Requestors protocol ID.
 * @param {string} username - The username of the requestor.
 * @param {Object} options - Additional options for the query.
 * @param {boolean} [options.count=false] - Whether to include the count of participants
 * in the query result.
 * @returns {Promise<Prisma.Sql>} - A promise that resolves when the query is built.
 */
async function buildParticipantsQueryAsync(body, protocol_id, username, { count = false } = {}) {
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

  const variants_sql = searchVariantIDsSQL({
    base_query,
    filters,
  });

  return participantsWithVariantsSQL({
    variants_sql,
    zygosities,
    snapshot_id,
    username,
    count,
  });
}

/**
 * Returns a SQL query for retrieving distinct values of an annotation field
 *  for a given base query parameters.
 *
 * @param {string} field - The annotation field to retrieve distinct values for.
 * @param {object} base_query_params - The base query parameters.
 * @param {number} base_query_params.source_id - The source ID.
 * @param {number} base_query_params.snapshot_id - The snapshot ID.
 * @param {number} base_query_params.protocol_id - The protocol ID of the requestor.
 * @param {Array} base_query_params.ranges - The ranges for the query.
 * @returns {object} - The distinct annotations query.
 */
function distinctAnnotationsQuery(field, base_query_params) {
  const field_sql = Prisma.raw(field);
  return Prisma.sql`
    select ${field_sql} as value, count(*) as count
    from gt_stats_annotations
    where ${buildBaseQuerySQL(base_query_params)}
    and ${field_sql} is not null
    group by ${field_sql}
    order by count desc
  `;
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

/**
 * Builds a SQL query to calculate the total count of records in the `gt_stats_annotations` table
 * based on the provided `base_query_params`.
 *
 * @param {Object} base_query_params - The base query parameters used to build the SQL query.
 * @param {number} base_query_params.source_id - The source ID.
 * @param {number} base_query_params.snapshot_id - The snapshot ID.
 * @param {number} base_query_params.protocol_id - The protocol ID of the requestor.
 * @param {Array} base_query_params.ranges - The ranges for the query.
 * @returns {Object} - The SQL query object.
 */
function buildTotalCountSQL(base_query_params) {
  const base_query_sql = buildBaseQuerySQL(base_query_params);

  // TODO: why query gt_stats_annotations?
  // what is the row count difference between  variants, annotations, gt_stats_annotations?
  const query = Prisma.sql`
    SELECT COUNT(*) as count
    FROM gt_stats_annotations
    WHERE (${base_query_sql})
  `;
  return query;
}

module.exports = {
  buildParticipantsQueryAsync,
  distinctAnnotationsQuery,
  annotationHistogramSQL,
  buildTotalCountSQL,
  buildBaseQuerySQL,
  searchGenotypeDataSQL,
};
