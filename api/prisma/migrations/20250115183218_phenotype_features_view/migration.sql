-- AlterTable
ALTER TABLE "medication" ALTER COLUMN "category" DROP NOT NULL;


/*
1. Average measurement for each day for each participant. 
2. Join both measurements by participant_id and event_date.
3. Calculate BMI using the formula: 10000 * weight(kg) / (height(cm) * height(cm))
4. Rank the measurements by participant_id and event_date in descending order. Latest measurement will have rank 1.
*/
create materialized view if not exists bmi_calculations as
with weights as 
(
	select participant_id, event_date, avg(cast(result as float)) as weight
	from measurement 
	where event_name = 'Weight' and cast(result as float) > 0
	group by participant_id, event_date
	order by participant_id, event_date desc
),
heights as
(
	select participant_id, event_date, avg(cast(result as float)) as height
	from measurement 
	where event_name = 'Height' and cast(result as float) > 0
	group by participant_id, event_date
	order by participant_id, event_date desc
)
select 
	w.participant_id,
    w.event_date,
    w.weight,
    h.height,
    ((w.weight*10000) / (h.height * h.height)) AS bmi,
    ROW_NUMBER() OVER (PARTITION BY w.participant_id ORDER BY w.event_date DESC) AS rn
from weights w
join heights h
on w.participant_id = h.participant_id and h.event_date = w.event_date;


/**
 * demographics table with additional features view
 * 
 * 1. Extract the age from the date of birth.
 * 2. Left join the demographic table with the bmi_calculations table on participant_id and select latest measurement (rank=1).
 */
CREATE VIEW demographic_extended AS
select 
  d.*, 
  extract(year from age(dob)) as age, 
  bmic.weight,
  bmic.height, 
  bmic.bmi
from 
  demographic d
  left join bmi_calculations bmic on d.participant_id = bmic.participant_id and bmic.rn=1
