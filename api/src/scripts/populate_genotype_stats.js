/* eslint-disable no-console */
const { Prisma, PrismaClient } = require('@prisma/client');
const fire = require('js-fire');

const prisma = new PrismaClient();

function insert_query(snapshot_id, protocol_id, chr = null, source_id = null) {
  /*
  This query calculates the genotype statistics for the given snapshot and protocol
  and inserts them into the genotype_stats table. The genotype statistics are derived
  from the genotype data in the variant table. The genotype statistics include the
  following features:
  - missing: number of missing genotypes
  - c0: number of 0/0 or 0|0
  - c1: number of 0/1 or 0|1
  - c2: number of 1|0
  - c3: number of 1/1 or 1|1
  - allele_num: number of alleles
  - allele_count: number of non-missing alleles
  - allele_freq: allele frequency

  common table expressions:
    indexes: list of participant ids for the given snapshot and protocol
    stats_data: calculates the genotype statistics for each variant
  stats_data:
    - for each variant, expand the genotype array such that each element is paired with its index
    - filter out missing genotypes and indices that are not in the indexes (participant ids)
    - aggregate the number of missing genotypes, c0, c1, c2, c3 from the filtered genotypes
    - building on the previous step,
      calculate the allele_num and allele_count using the current variant phase
    - building on the previous step, calculate the allele frequency

  insert query:
    - insert the genotype statistics for each variant into the genotype_stats table
      along with snapshot_id, protocol_id
    - on conflict do nothing to avoid inserting duplicate records

  Notes:
    adding "p.genotype_idx is not null" to where clause in indexes CTE
    slows down the query/inserts significantly. The reason is unknown.
    This condition is not necessary because idx from "idx IN (select id from indexes)" in stats_data
    is never null.
  */
  // eslint-disable-next-line max-len
  const select = Prisma.raw(`select chr, position, ref, alt, source_id, ${snapshot_id}, ${protocol_id}, phase, missing, c0, c1, c2, c3, allele_num, allele_count, allele_freq from stats_data`);

  const filters = ([
    chr != null ? Prisma.sql`v.chr = ${chr}` : null,
    source_id != null ? Prisma.sql`v.source_id = ${source_id}` : null,
  ]).filter((f) => f != null);
  const filter_sql = filters.length > 0 ? Prisma.sql`where ${Prisma.join(filters, ' AND ')}` : Prisma.empty;

  return Prisma.sql`with
    indexes as (
      select
          distinct p.genotype_idx as id
      from participant p 
      join participant_protocol pp on pp.participant_id = p.id
      join participants_per_snapshot pps on pps.id = pp.participant_id
      where
        pp.protocol_id = ${protocol_id} and 
        pps.snapshot_id = ${snapshot_id}
    ),
    stats_data as (
      select v.chr, v."position", v."ref", v.alt, v.source_id, v.phase,
            ac.missing as missing,
            ac.c0 as c0,
            ac.c1 as c1,
            ac.c2 as c2,
            ac.c3 as c3,
            ac2.allele_num as allele_num,
            ac2.allele_count as allele_count,
            ac3.allele_freq as allele_freq
      from variant v
      CROSS join LATERAL (
        select
            COUNT(CASE WHEN g = -1 THEN 1 END) AS missing,
            COUNT(CASE WHEN g = 0 THEN 1 END) AS c0,
            COUNT(CASE WHEN g = 1 THEN 1 END) AS c1,
            COUNT(CASE WHEN g = 2 THEN 1 END) AS c2,
            COUNT(CASE WHEN g = 3 THEN 1 END) AS c3
        FROM
            unnest(v.genotype) with ordinality t(g,idx)
        WHERE g IS NOT null
              and idx IN (select id from indexes)
      ) AS ac
      CROSS join lateral (
          select 
              2*(ac.c0 + ac.c1 + ac.c2 + ac.c3) as allele_num,
              case
                when v.phase = false then (ac.c1 + 2*ac.c3)
                when v.phase = true then (ac.c1 + ac.c2 + 2*ac.c3)
              end as allele_count
      ) as ac2
      CROSS join lateral (
        SELECT CASE 
          WHEN ac2.allele_num = 0 THEN 0 
          ELSE ac2.allele_count::FLOAT / ac2.allele_num 
        END AS allele_freq
      ) as ac3
      ${filter_sql}
    )
    insert into genotype_stats
    ${select}
    on conflict do nothing`;
}

async function main(snapshot_id, protocol_id, chr = null, source_id = null) {
  // Populate the genotype_stats table with derived genotype features
  // for the given snapshot and protocol
  const query = insert_query(snapshot_id, protocol_id, chr, source_id);
  console.log(query.sql, query.values);
  console.log('Start: ', new Date().toISOString());
  return prisma.$executeRaw(query)
    .then((res) => {
      console.log(res);
      prisma.$disconnect();
    }).catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    }).finally(() => {
      console.log('End: ', new Date().toISOString());
    });
}

// node src/scripts/populate_genotype_stats.js --snapshot_id 1 --protocol_id 1
// node src/scripts/populate_genotype_stats.js --snapshot_id 1 --protocol_id 1 --chr 22
fire(main);
