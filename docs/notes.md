To delete participant data:

```sql
delete from demographic where participant_id in (38076, 38193, 13068);
delete from lab where participant_id in (38076, 38193, 13068);
delete from covid_test where participant_id in (38076, 38193, 13068);
delete from covid_vax where participant_id in (38076, 38193, 13068);
delete from dx where participant_id in (38076, 38193, 13068);
delete from hospital where participant_id in (38076, 38193, 13068);
delete from medication where participant_id in (38076, 38193, 13068);
delete from participant_protocol where participant_id in (38076, 38193, 13068);
delete from participant where id in (38076, 38193, 13068);
```

Participants of these ids 38076, 38193, 13068 have spurious dob values, so we deleted them.