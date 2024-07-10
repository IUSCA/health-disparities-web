create materialized view if not exists ehr_participant_counts_by_name as
select
  'dx' as category,
  name,
  count(name) as count
from
  (
    select
      distinct name,
      participant_id
    from
      dx
  ) t
group by
  name
union
select
  'lab' as category,
  name,
  count(name) as count
from
  (
    select
      distinct name,
      participant_id
    from
      lab
  ) t
group by
  name
union
select
  'medication' as category,
  name,
  count(name) as count
from
  (
    select
      distinct name,
      participant_id
    from
      medication
  ) t
group by
  name
union
select
  'hospital' as category,
  name,
  count(name) as count
from
  hospital h
  join (
    select
      distinct name,
      code,
      code_system
    from
      dx
  ) t on h.dx_code = t.code
  and h.dx_code_system = t.code_system
group by
  name;


CREATE INDEX ehr_participant_counts_by_name_name_trgm_idx ON ehr_participant_counts_by_name USING gin ("name" gin_trgm_ops);