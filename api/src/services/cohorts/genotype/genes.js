const { Prisma, PrismaClient } = require('@prisma/client');
const config = require('config');

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
