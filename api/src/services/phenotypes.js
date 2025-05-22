const NodeCache = require('node-cache');
const { Prisma } = require('@prisma/client');

const prisma = require('@/db');

const cache = new NodeCache();

async function getCounts(category, keyword) {
  const CACHE_KEY = `phenotype_${category}_total_counts`;
  if (!keyword && cache.get(CACHE_KEY)) {
    return cache.get(CACHE_KEY);
  }

  const table = Prisma.raw(category);
  const where_sql = keyword ? Prisma.sql`where name ilike ${`%${keyword}%`}` : Prisma.empty;

  let sql = Prisma.empty;
  if (['lab', 'medication'].includes(category)) {
    sql = Prisma.sql`
        select 
          count(distinct name) as count, 
          count(distinct participant_id) as participant_count 
        from ${table}
        ${where_sql}
    `;
  } else if (category === 'dx') {
    sql = Prisma.sql`
        select
          count(distinct name) as count,
          count(distinct participant_id) as participant_count
        from dx
        where name = any(
          select name from dx_unique_name ${where_sql}
        )
      `;
  } else if (category === 'hospital') { // hospital
    if (keyword) {
      sql = Prisma.sql`
          select 
            count(distinct (dx_code, dx_code_system)) as count, 
            count(distinct participant_id) as participant_count
          from hospital h join
            ( select distinct code, code_system 
              from dx
              where "name" = any(
                select name from dx_unique_name dun ${where_sql}
              )
            ) t on h.dx_code = t.code and h.dx_code_system = t.code_system;
        `;
    } else {
      sql = Prisma.sql`
        select
          count(distinct (dx_code, dx_code_system)) as count,
          count(distinct participant_id) as participant_count
        from hospital
      `;
    }
  }

  const rows = await prisma.$queryRaw(sql);

  const v = {
    total: parseInt(rows[0].count, 10),
    participants: parseInt(rows[0].participant_count, 10),
  };

  if (!keyword) {
    // server-side cache
    cache.set(CACHE_KEY, v);
  }
  return v;
}

module.exports = {
  getCounts,
};
