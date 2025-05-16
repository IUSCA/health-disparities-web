const { Prisma } = require('@prisma/client');
const { getGeneRegions, geneFilterSQL } = require('./genes');

/**
 * Transforms an array of ranges based on their type.
 * If the range type is 'gene', it fetches gene regions and adds them to the range value.
 * @param {Array} ranges - The array of ranges to transform.
 * @param {string} build - The build to use for fetching gene regions.
 * @returns {Promise<Array>} - A promise that resolves to the transformed array of ranges.
 */
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

/**
 * Builds the SQL query for filtering ranges based on the provided ranges array.
 *
 * @param {Array} ranges - The array of ranges to build the SQL query for.
 * @returns {string|null} The built SQL query or null if no valid ranges are provided.
 */
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
    // eslint-disable-next-line max-len
    return Prisma.sql`(chr = ${range.value.chr} AND position = ${range.value.position} AND ref = ${range.value.ref} AND alt = ${range.value.alt})`;
  }).filter((r) => r != null);

  if (range_sqls.length === 0) {
    return null;
  }

  return Prisma.join(range_sqls, ' OR  ');
}

module.exports = {
  transformRanges,
  buildRangesSQL,
};
