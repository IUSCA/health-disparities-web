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
      (SELECT MIN(${column}) AS min_value, MAX(${column}) AS max_value FROM ${table}) AS range_values
    GROUP BY
      bin_number, bin_start, bin_end
    ORDER BY
      bin_number;
  `;
  return sql;
}

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
};
