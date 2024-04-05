# Problem: Variant Search with dervied features is slow

derived features are columns that are not part of the original data but are computed from the original data. For example, the derived feature could be the number of allele counts in at a genomic site for a given population.

All derived features:
- missing count
- 0/0 count
- 0/1 count
- 1/1 count
- allele number
- allele count
- allele frequency

A query consists of filtering variants by one or more of these derived features given a population / participant set. The participant set is defined by specifying a snapshot_id and current user's protocols.

To execute a search query, the system needs to:
- compute the participant set (ids)
- for each variant, compute the derived features. This involves:
  - expanding the genotype array and selecting values for the participant set
  - computing the derived features from these filtered values
- filter variants by the derived features

If the initial range of variant is large, the system needs to compute the derived features for all variants in the range. This is slow.


### Solution: Precompute derived features

Precompute the derived features for all variants in the database and storing them in another table makes the search trivial and fast.

As the derived features depend on generated participant set, we need to precompute the derived features for all possible participant sets.

The number of possible participant sets is number of snapshots * number of combinations of protocols, as each user (researcher) can have one or more protocol. This is a large number and not feasible to precompute all possible participant sets.

If we resctrict each user to only one protocol, then the number of possible participant sets is number of snapshots * number of protocols.

A genotype_stats table can be created with the following columns:
- chromosome, position, ref, alt, source_id to identify the variant
- snapshot_id
- protocol_id
- all derived feature columns

The number of rows in this table is number of variants * number of snapshots * number of protocols. This is a large number that increases the index size and storage requirements.

To keep the index size small, we can partition the table first by snapshot_id and then sub-partition each partition by chromosome. This way, the index size is reduced and the search is faster.

We do not partition by protocol_id as the number of protocols is small and is not expected to grow.

Another advantage of first partitioning by snapshot_id is that the derived features for a given snapshot can be easily deleted when the snapshot is deleted. Or we can delete partitions of older snapshots that are less likely to be queries to save space. In this case, we can fallback to the original method of computing derived features on the fly.

genotype_stats table 227656 rows - 106 MB, 40 MB index size inclded in the table size. The index size is large in comparison to the variant table size whose index size is 13 MB for 1/3rd number of rows.


### Alternate Solution tried
To keep the row count in genotype_stats table small, we can store the derived features as a JSON object in a single column. This way, the number of rows in the table is just number of variants. This is a smaller number and the index size is smaller. It can still be partitioned by chromosome.

```json
{
  "1": {
    "1": {
      "ac": 55,
      "af": 0.04032258064516129,
      "an": 1364,
      "c0": 628,
      "c1": 28,
      "c2": 25,
      "c3": 1,
      "na": 0
    },
    "2": {
      "ac": 65,
      "af": 0.0517515923566879,
      "an": 1256,
      "c0": 563,
      "c1": 26,
      "c2": 39,
      "c3": 0,
      "na": 0
    },
    "3": {
      "ac": 107,
      "af": 0.04828519855595668,
      "an": 2216,
      "c0": 1001,
      "c1": 44,
      "c2": 63,
      "c3": 0,
      "na": 0
    }
  }
}
```
the above is stored as JSONB in the genotype_stats table.

Follows the pattern: `{snaphot_id: {protocol_id: {derived_features}}}`

annotation table 227597 rows - 34 MB
variant table 227656 rows - 245 MB

genotype_stats table 227656 rows - 175 MB
index size for 227656 rows - 30 MB (included in the table size)


storing as json reduces the number of rows but increases the overall space used by the table. It has other disadvantages like 
- need a special syntax to query the json object `where (stats->'1'->'1'->>'ac')::int > 50`
- adding and removing stats for a snapshot / protocol requires careful update of the json object (complicated SQL)

SQL to insert derived features for a given snapshot and protocol:
- it inserts the derived features for a given variant, if it does not exist
- if it exists, it updates the json for the given snapshot and protocol by adding to it a new path with the derived features
```sql
with
  indexes as (
  	select
  		distinct p.genotype_idx as id
  	from participant p 
	join participant_protocol pp on pp.participant_id = p.id
	join participants_per_snapshot pps on pps.id = pp.participant_id
	where pp.protocol_id = 1 and pps.snapshot_id = 1
  ),
  stats_data as (
  	select v.chr, v."position", v."ref", v.alt, v.source_id,
		jsonb_build_object(
	        'na', ac.missing,
	        'c0', ac.c0,
	        'c1', ac.c1,
	        'c2', ac.c2,
	        'c3', ac.c3,
	        'an', ac2.allele_num,
	        'ac', ac2.allele_count,
	        'af', ac3.allele_freq
	    ) AS stats
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
	    		when v.phase = false then (ac.c1 + 2*ac.c2)
			    when v.phase = true then (ac.c1 + ac.c2 + 2*ac.c3)
		  	end as allele_count
	) as ac2
	CROSS join lateral (
	    select ac2.allele_count::float/ coalesce(nullif(ac2.allele_num,0), 1) as allele_freq
	) as ac3
)
insert into genotype_stats (chr, position, ref, alt, source_id, stats)
select chr, position, ref, alt, source_id, 
	jsonb_build_object(
		'1.1',
		stats
	) as stats 
from stats_data
on conflict (chr, position, ref, alt, source_id) do update set
	stats = jsonb_set(
		genotype_stats.stats,
		'{1.1}',
		EXCLUDED.stats->'1.1',
    	true
	);
```
