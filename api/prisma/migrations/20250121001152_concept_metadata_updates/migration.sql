drop materialized view concept_metadata;

create materialized view if not exists concept_metadata as
WITH RECURSIVE ancestors AS (
-- Base case: Select direct relationships
    SELECT
        cr.concept_id_1 AS child_id,
        cr.concept_id_2 AS parent_id,
        c1.concept_code AS child_code,
        c2.concept_code AS parent_code,
        1 as level
    FROM
        concept_relationship cr
        JOIN concept c1 ON cr.concept_id_1 = c1.concept_id
        JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
    WHERE
        c1.vocabulary_id = 'ICD10CM'
        AND c2.vocabulary_id = 'ICD10CM'
        AND cr.relationship_id = 'Is a'
    UNION
    ALL -- Recursive case: Join with the Ancestors CTE
    SELECT
        a.child_id,
        cr.concept_id_2 AS parent_id,
        a.child_code,
        c2.concept_code AS parent_code,
        a.level + 1 as level
    FROM
        Ancestors a
        JOIN concept_relationship cr ON a.parent_id = cr.concept_id_1
        JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
    WHERE
        c2.vocabulary_id = 'ICD10CM'
        AND cr.relationship_id = 'Is a'
),
distinct_ancestors AS (
    -- there are duplicate (child_id, parent_id) because M "ICD10 code"s have two parents. 
    -- see select * from concept_relationship cr where cr.concept_id_1 = 42616305;
    -- so we group by child_id, parent_id and select one with maximum value to preserve the longest parent chain
    SELECT
        child_id,
        parent_id,
        MAX(level) AS max_level
    FROM
        ancestors
    GROUP BY
        child_id,
        parent_id
),
nodes as (
    SELECT
        da.child_id as id,
        array_agg(
            parent_id
            ORDER BY
                max_level DESC
        ) || da.child_id as path
    FROM
        distinct_ancestors da
    GROUP BY
        da.child_id
)
select
    id,
    array_to_string(path, '.') :: ltree as path,
    to_tsvector('english', coalesce(c.concept_name, '')) as textsearchable_index_col
from
    nodes
    join concept c on c.concept_id = nodes.id
union
-- ICD10CM concepts that have no parents
select 
	c.concept_id as id,
	c.concept_id::text:: ltree as path,
    to_tsvector('english', coalesce(c.concept_name, '')) as textsearchable_index_col
from
concept c
where 
	c.vocabulary_id = 'ICD10CM' and
	not exists (
		select 1
		from concept_relationship cr
		where cr.relationship_id = 'Is a' and cr.concept_id_1 = c.concept_id
	);
