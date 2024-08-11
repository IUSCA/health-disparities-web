const { Prisma } = require('@prisma/client');

function searchTreeSql({ search_phrase }) {
  return Prisma.sql`
  with search_results as (
    select c.concept_id
    from concept c
    join concept_metadata cm on cm.id = c.concept_id 
    where vocabulary_id = 'ICD10' 
    and concept_class_id in ('ICD10 Hierarchy', 'ICD10 code')
    and (cm.textsearchable_index_col @@ websearch_to_tsquery('english', ${search_phrase}))
  ),
  third_parent as (
    select distinct subpath(path, 0, 3) as path
    from search_results sr
    join concept_metadata ct on ct.id = sr.concept_id
    where nlevel(path) > 2
  ),
  all_descendants as (
      select ct.*
      from concept_metadata ct
      join third_parent sc on ct.path <@ sc.path
  )
  select c.*, subpath(ad.path, 2)::text as path, case when sr.concept_id is not null then true else false end as is_a_search_result
  from all_descendants ad
  join concept c on c.concept_id = ad.id
  left join search_results sr on c.concept_id = sr.concept_id
`;
}

function synonymsSql({ search_phrase }) {
  return Prisma.sql`
    with t as (
      select
        cs.concept_id,
        cs.concept_synonym_name,
        c.concept_name,
        similarity(cs.concept_synonym_name, ${search_phrase}) - similarity(cs.concept_synonym_name, c.concept_name) as score
      from
        concept_synonym_metadata cs
        join concept c on cs.concept_id = c.concept_id
      where
        textsearchable_index_col @@ websearch_to_tsquery('english', ${search_phrase})
    ),
    grouped_t as (
      select
        concept_name,
        avg(score) as avg_score
      from
        t
      group by
        concept_name
      having
        avg(score) > 0
    )
    select
      concept_name,
      avg_score
    from
      grouped_t
    where
      exists (
        select
          1
        from
          concept_metadata cm
        where
          ts_rank_cd(
            cm.textsearchable_index_col,
            plainto_tsquery_or(grouped_t.concept_name)
          ) >= 0.1
      )
    order by
      avg_score desc
    limit 5
  `;
}

function descendantsSql({ code }) {
  return Prisma.sql`
  with nodes as (
    select c.*, cm."path" as "path" from
    concept_metadata cm
    join concept c on c.concept_id = cm.id
  )
  select *
  from nodes
  where "path" <@ (
    select "path" from 
    nodes
    where concept_code = ${code}
  )
  `;
}

module.exports = {
  searchTreeSql,
  synonymsSql,
  descendantsSql,
};
