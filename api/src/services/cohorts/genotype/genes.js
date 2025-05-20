const { Prisma, PrismaClient } = require('@prisma/client');
const config = require('config');

const prisma = new PrismaClient();

/**
 * Merges overlapping intervals.
 *
 * @param {Array<Array<number>>} intervals - Array of intervals represented as
 * 2-tuples [[start, end], [start, end], ...].
 * intervals are assumed to be sorted by start and then end
 * @returns {Array<Array<number>>} - Array of merged intervals.
 */
function mergeIntervals(intervals) {
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

/**
 * Retrieves distinct ranges for a gene based on the provided gene name and build.
 * Queries the ncbiRefSeqCurated table.
 *
 * @param {string} gene_name - The name of the gene.
 * @param {string} build - The build version.
 * @returns {Promise<Array<Object>>} - An array of objects representing the
 * distinct ranges of the gene. Each object has the following properties:
 * - chr: The chromosome number.
 * - start: The start position.
 * - end: The end position.
 */
// cspell: ignore nrsc
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

/**
 * Retrieves the gene regions (distinct ranges) for a given gene name and build.
 * @param {string} gene_name - The name of the gene.
 * @param {string} build - The build version.
 * @returns {Promise<Array<Object>>} An array of gene regions,
 * each containing the chromosome, start, and end positions.
 * returns [{chr, start, end}, ...]
 */
async function getGeneRegions(gene_name, build) {
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

/**
 * Generates SQL filter conditions based on the given regions.
 * Each filter is like `(chr = ${chr} AND position BETWEEN ${start} AND ${end})`.
 * The filters are joined with OR.
 *
 * @param {Array<Object>} regions - An array of region objects containing
 * `chr`, `start`, and `end` properties.
 * @returns {string|null} - The generated SQL filter conditions joined with OR,
 * or null if no regions are provided.
 */
function geneFilterSQL(regions) {
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

module.exports = {
  getGeneRegions,
  geneFilterSQL,
};
