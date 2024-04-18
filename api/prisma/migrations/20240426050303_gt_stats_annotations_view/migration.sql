-- This is an empty migration.
CREATE VIEW gt_stats_annotations AS
select a.*, 
	gs.snapshot_id,
	gs.source_id,
	gs.protocol_id,
	gs.phase,
	gs.missing,
	gs.c0,
	gs.c1,
	gs.c2,
	gs.c3,
	gs.allele_number,
	gs.allele_count,
	gs.allele_freq
from 
	genotype_stats gs 
	join annotation a on gs.chr = a.chr and gs."position" = a."position" and gs."ref" = a."ref" and gs.alt  = a.alt;