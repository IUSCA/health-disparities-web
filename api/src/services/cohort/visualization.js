const { Prisma, PrismaClient } = require('@prisma/client');
const {
  histogramSQL,
  dateRangeSQL,
  aggregateDateByMonthYearSQL,
  aggregateDateByYearSQL,
  aggregateDateByYearsSQL,
} = require('../queries');

const prisma = new PrismaClient();

function ageHistogramSQL(participant_ids, num_bins) {
  return Prisma.sql`
    with data as (
      select extract(year from age(dob)) as age from demographic
      WHERE participant_id = ANY(${participant_ids})
    )
    ${histogramSQL('data', 'age', num_bins)}
  `;
}

async function dateHistogram(participant_ids, _column, num_bins) {
  // To determine bin size, get the range of the column
  const column = Prisma.raw(_column);
  const rangeSQL = Prisma.sql`
    with data as (
      select ${column} from demographic
      WHERE participant_id = ANY(${participant_ids})
    )
    ${dateRangeSQL('data', _column, num_bins)}
  `;
  // console.log(rangeSQL.sql, rangeSQL.values);
  const _rangeRows = await prisma.$queryRaw(rangeSQL);

  // console.log(_rangeRows);

  if (_rangeRows.length === 0) {
    return [];
  }
  const dateRange = _rangeRows[0];
  let binSize = null;
  if (dateRange.years === 0) {
    binSize = 'month';
  } else if (dateRange.years <= 10) {
    binSize = 'year';
  // } else if (dateRange.years <= 50) {
  //   binSize = 5;
  // } else if (dateRange.years <= 100) {
  //   binSize = 10;
  } else {
    // choose bin size of x years such that num_bins * x = dateRange.years
    binSize = Math.ceil(dateRange.years / num_bins);
    if (binSize === 1) {
      binSize = 'year';
    }
  }

  let aggSQL = null;
  if (binSize === 'month') {
    aggSQL = aggregateDateByMonthYearSQL('data', _column);
  } else if (binSize === 'year') {
    aggSQL = aggregateDateByYearSQL('data', _column);
  } else {
    aggSQL = aggregateDateByYearsSQL('data', _column, binSize);
  }

  const sql = Prisma.sql`
    with data as (
      select ${column} from demographic
      WHERE participant_id = ANY(${participant_ids})
    )
    ${aggSQL}
  `;
  // console.log(sql.sql, sql.values);
  return prisma.$queryRaw(sql);
}

module.exports = {
  ageHistogramSQL,
  dateHistogram,
};
