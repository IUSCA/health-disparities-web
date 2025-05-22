const { Prisma } = require('@prisma/client');
const prisma = require('@/db');
const {
  histogramSQL2,
  dateRangeSQL,
  aggregateDateByMonthYearSQL,
  aggregateDateByYearSQL,
  aggregateDateByYearsSQL,
} = require('@/services/queries');

function ageHistogramSQL(cohort_id, bin_width) {
  return Prisma.sql`
    with data as (
      select extract(year from age(dob)) as age from demographic d
      JOIN (
        SELECT participants 
        FROM cohort 
        WHERE id = CAST(${cohort_id} AS UUID)
      ) c ON d.participant_id = ANY(c.participants)
    )
    ${histogramSQL2('data', 'age', bin_width)}
  `;
}

async function dateHistogram(cohort_id, _column, num_bins) {
  // To determine bin size, get the range of the column
  const column = Prisma.raw(_column);
  const rangeSQL = Prisma.sql`
    with data as (
      select ${column} from demographic d
      JOIN (
        SELECT participants 
        FROM cohort 
        WHERE id = CAST(${cohort_id} AS UUID)
      ) c ON d.participant_id = ANY(c.participants)
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
      select ${column} from demographic d
      JOIN (
        SELECT participants 
        FROM cohort 
        WHERE id = CAST(${cohort_id} AS UUID)
      ) c ON d.participant_id = ANY(c.participants)
    )
    ${aggSQL}
  `;
  // console.log(sql.sql, sql.values);
  return prisma.$queryRaw(sql);
}

function aggregateColumnSQL(cohort_id, _column) {
  const column = Prisma.raw(_column);
  const sql = Prisma.sql`
  select ${column}, count(*) as count from demographic d
    JOIN (
      SELECT participants 
      FROM cohort 
      WHERE id = CAST(${cohort_id} AS UUID)
    ) c ON d.participant_id = ANY(c.participants)
  group by ${column}
  order by count desc
  `;
  return sql;
}

module.exports = {
  ageHistogramSQL,
  dateHistogram,
  aggregateColumnSQL,
};
