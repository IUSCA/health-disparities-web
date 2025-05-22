```sql
explain analyze 
with DxFilter as ( 
	SELECT DISTINCT participant_id
	  FROM dx
	  WHERE name = 'DIABETES MELLITUS'
)
SELECT COUNT(p.id) as count
  FROM participant p
  JOIN DxFilter df ON p.id = df.participant_id
  WHERE (
  EXISTS (
    SELECT 1
    FROM lab t
    WHERE
      t.participant_id = p.id
      AND name IS NOT NULL
  ))
```

Runs faster than

```sql
explain analyze 
SELECT COUNT(p.id) as count
  FROM participant p
  WHERE (
  EXISTS (
    SELECT 1
    FROM dx t
    where
      name = 'DIABETES MELLITUS'
      and t.participant_id = p.id
  ) and 
  EXISTS (
    SELECT 1
    FROM lab t
    WHERE
      t.participant_id = p.id
      AND name IS NOT NULL
  ))
```

Query plan for Query A
```
Aggregate  (cost=221084.94..221084.95 rows=1 width=8) (actual time=992.548..995.262 rows=1 loops=1)
  ->  Nested Loop Semi Join  (cost=219171.50..221084.51 rows=173 width=4) (actual time=990.927..995.253 rows=10 loops=1)
        ->  Nested Loop  (cost=219171.07..220376.11 rows=1549 width=8) (actual time=990.742..994.173 rows=40 loops=1)
              ->  Unique  (cost=219170.78..219360.30 rows=1549 width=4) (actual time=990.594..993.334 rows=40 loops=1)
                    ->  Gather Merge  (cost=219170.78..219356.32 rows=1593 width=4) (actual time=990.593..993.322 rows=69 loops=1)
                          Workers Planned: 2
                          Workers Launched: 2
                          ->  Sort  (cost=218170.76..218172.42 rows=664 width=4) (actual time=926.080..926.082 rows=23 loops=3)
                                Sort Key: dx.participant_id
                                Sort Method: quicksort  Memory: 26kB
                                Worker 0:  Sort Method: quicksort  Memory: 25kB
                                Worker 1:  Sort Method: quicksort  Memory: 25kB
                                ->  Parallel Seq Scan on dx  (cost=0.00..218139.64 rows=664 width=4) (actual time=135.535..924.915 rows=23 loops=3)
                                      Filter: (name = 'DIABETES MELLITUS'::text)
                                      Rows Removed by Filter: 4359261
              ->  Index Only Scan using participant_pkey on participant p  (cost=0.29..0.65 rows=1 width=4) (actual time=0.020..0.020 rows=1 loops=40)
                    Index Cond: (id = dx.participant_id)
                    Heap Fetches: 0
        ->  Index Scan using lab_participant_id_idx on lab t  (cost=0.43..10.37 rows=440 width=4) (actual time=0.026..0.027 rows=0 loops=40)
              Index Cond: (participant_id = p.id)
              Filter: (name IS NOT NULL)
Planning Time: 3.478 ms
JIT:
  Functions: 25
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 15.459 ms, Inlining 0.000 ms, Optimization 4.627 ms, Emission 31.685 ms, Total 51.771 ms
Execution Time: 1006.906 ms
```

Query B:
```
Finalize Aggregate  (cost=88440.57..88440.58 rows=1 width=8) (actual time=6889.281..6893.870 rows=1 loops=1)
  ->  Gather  (cost=88440.46..88440.57 rows=1 width=8) (actual time=6888.160..6893.864 rows=2 loops=1)
        Workers Planned: 1
        Workers Launched: 1
        ->  Partial Aggregate  (cost=87440.46..87440.47 rows=1 width=8) (actual time=6840.741..6840.742 rows=1 loops=2)
              ->  Nested Loop Semi Join  (cost=1.16..87440.01 rows=179 width=4) (actual time=2681.523..6840.724 rows=5 loops=2)
                    ->  Nested Loop Semi Join  (cost=0.72..13702.59 rows=3099 width=8) (actual time=2.000..137.570 rows=2974 loops=2)
                          ->  Parallel Index Only Scan using participant_pkey on participant p  (cost=0.29..1036.65 rows=27695 width=4) (actual time=0.194..3.338 rows=23541 loops=2)
                                Heap Fetches: 0
                          ->  Index Scan using lab_participant_id_idx on lab t_1  (cost=0.43..10.37 rows=440 width=4) (actual time=0.006..0.006 rows=0 loops=47082)
                                Index Cond: (participant_id = p.id)
                                Filter: (name IS NOT NULL)
                    ->  Index Scan using dx_participant_id_idx on dx t  (cost=0.43..23.79 rows=1 width=4) (actual time=2.254..2.254 rows=0 loops=5947)
                          Index Cond: (participant_id = p.id)
                          Filter: (name = 'DIABETES MELLITUS'::text)
                          Rows Removed by Filter: 463
Planning Time: 4.798 ms
Execution Time: 6894.678 ms
```