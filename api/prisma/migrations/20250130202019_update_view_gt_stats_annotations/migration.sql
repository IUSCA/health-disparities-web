DROP VIEW "gt_stats_annotations";

CREATE VIEW gt_stats_annotations AS
select *
from 
	genotype_stats gs 
	left join annotation a using (chr, position, ref, alt);