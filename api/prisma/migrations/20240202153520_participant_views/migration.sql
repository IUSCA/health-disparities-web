-- This is an empty migration.
create
or replace view participants_per_snapshot as
select
  s.id as snapshot_id,
  p.*
from
  participant p
  join "snapshot" enroll on p.enroll_snapshot_id = enroll.id
  left join "snapshot" disenroll on p.disenroll_snapshot_id = disenroll.id
  join "snapshot" s on enroll."timestamp" <= s.timestamp
  and (
    disenroll."timestamp" is null
    or disenroll."timestamp" > s."timestamp"
  );

create
or replace view participants_per_user as
select
  distinct p.id,
  u.username
from
  "user" u
  join user_protocol up on u.id = up.user_id
  join participant_protocol pp on pp.protocol_id = up.protocol_id
  join participant p on p.id = pp.participant_id;