/* eslint-disable max-len */
const { Prisma } = require('@prisma/client');

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
      (SELECT MIN(${column}) AS min_value, MAX(${column})+1 AS max_value FROM ${table}) AS range_values
    GROUP BY
      bin_number, bin_start, bin_end
    ORDER BY
      bin_number;
  `;
  return sql;
}

function histogramSQL2(_table, _column, _bin_width) {
  const table = Prisma.raw(_table);
  const column = Prisma.raw(_column);
  const bin_width = Prisma.raw(_bin_width);

  const sql = Prisma.sql`select
    width_bucket(${column}, min_value, max_value, num_bins) AS bin_number,
    min_value + (
      width_bucket(${column}, min_value, max_value, num_bins) - 1
    ) * ${bin_width} AS bin_start,
    min_value + (
      width_bucket(${column}, min_value, max_value, num_bins)
    ) * ${bin_width} as bin_end,
    count(*) :: int AS bin_count
  from
    ${table},
    (
      select
        floor(min(${column}) / ${bin_width}) * ${bin_width} as min_value,
        ceil(max(${column}) / ${bin_width}) * ${bin_width} as max_value,
        ceil(
          (ceil(max(${column}) / ${bin_width}) * ${bin_width} - floor(min(${column}) / ${bin_width}) * ${bin_width}) / ${bin_width}
        ) :: int AS num_bins
      from
        ${table}
    ) as range_values
  group by
    bin_number,
    bin_start,
    bin_end
  order by
    bin_number;
  `;
  return sql;
}

// alternative implementation
// the range is derived from the data in that bucket itself
// this fails when there are empty buckets
// also the range is not continuous

// function histogramSQL(_table, _column, _num_bins) {
//   const table = Prisma.raw(_table);
//   const column = Prisma.raw(_column);
//   const num_bins = Prisma.raw(_num_bins);

//   const sql = Prisma.sql`SELECT
//       width_bucket(${column}, min_value, max_value, ${num_bins}) AS bin_number,
//       lower(numrange(min(age),max(age))) as bin_start,
//       upper(numrange(min(age),max(age))) as bin_end,
//       count(*)::int AS bin_count
//     FROM
//       ${table},
//       (SELECT
//         MIN(${column}) AS min_value,
//         MAX(${column})+1 AS max_value
//         FROM ${table}
//       ) AS range_values
//     GROUP BY
//       bin_number
//     ORDER BY
//       bin_number;
//   `;
//   return sql;
// }

function aggregateDateByMonthYearSQL(_table, _column) {
  const table = Prisma.raw(_table);
  const column = Prisma.raw(_column);
  return Prisma.sql`SELECT 
    TO_CHAR(${column}, 'Mon-YYYY') AS label,
    COUNT(*) AS count
  FROM 
    ${table} 
  GROUP BY 
    label
  ORDER BY 
    TO_DATE(TO_CHAR(${column}, 'Mon-YYYY'), 'Mon-YYYY')`;
}

function aggregateDateByYearSQL(_table, _column) {
  const table = Prisma.raw(_table);
  const column = Prisma.raw(_column);
  return Prisma.sql`SELECT 
    TO_CHAR(${column}, 'YYYY') AS label,
    COUNT(*) AS count
  FROM 
    ${table} 
  GROUP BY 
    label
  ORDER BY 
    label`;
}

function aggregateDateByYearsSQL(_table, _column, _bin_size) {
  const table = Prisma.raw(_table);
  const column = Prisma.raw(_column);
  const bin_size = Prisma.raw(_bin_size);
  const bin_size_1 = Prisma.raw(_bin_size - 1);
  return Prisma.sql`SELECT
    CONCAT(EXTRACT(YEAR FROM ${column})::INT / ${bin_size} * ${bin_size}, '-', EXTRACT(YEAR FROM ${column})::INT / ${bin_size} * ${bin_size} + ${bin_size_1}) AS label,
    COUNT(*) AS count
  FROM
    ${table}
  GROUP BY
    EXTRACT(YEAR FROM ${column})::INT / ${bin_size}
  ORDER BY
    label`;
}

function dateRangeSQL(_table, _column) {
  const table = Prisma.raw(_table);
  const column = Prisma.raw(_column);
  return Prisma.sql`
  SELECT
    EXTRACT(YEAR FROM MAX(${column})) - EXTRACT(YEAR FROM MIN(${column})) AS years,
    EXTRACT(MONTH FROM MAX(${column})) - EXTRACT(MONTH FROM MIN(${column})) 
        + 12 * (EXTRACT(YEAR FROM MAX(${column})) - EXTRACT(YEAR FROM MIN(${column}))) AS months
  FROM
    ${table};`;
}

module.exports = {
  histogramSQL,
  aggregateDateByMonthYearSQL,
  aggregateDateByYearSQL,
  aggregateDateByYearsSQL,
  dateRangeSQL,
  histogramSQL2,
};
