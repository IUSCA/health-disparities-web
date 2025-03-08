const { Prisma } = require('@prisma/client');

// function searchTreeSql({ search_phrase }) {
//   return Prisma.sql`
//   with search_results as (
//     select c.concept_id
//     from concept c
//     join concept_metadata cm on cm.id = c.concept_id
//     where vocabulary_id = 'ICD10'
//     and concept_class_id in ('ICD10 Hierarchy', 'ICD10 code')
//     and (cm.textsearchable_index_col @@ websearch_to_tsquery('english', ${search_phrase}))
//   ),
//   third_parent as (
//     select distinct subpath(path, 0, 3) as path
//     from search_results sr
//     join concept_metadata ct on ct.id = sr.concept_id
//     where nlevel(path) > 2
//   ),
//   all_descendants as (
//       select ct.*
//       from concept_metadata ct
//       join third_parent sc on ct.path <@ sc.path
//   )
//   select
//     c.*, subpath(ad.path, 2)::text as path,
//     case when sr.concept_id is not null then true else false end as is_a_search_result
//   from all_descendants ad
//   join concept c on c.concept_id = ad.id
//   left join search_results sr on c.concept_id = sr.concept_id
// `;
// }

function synonymsSql({ search_phrase }) {
  /**
   * Goal: If the search_phrase is "heart attack", return concepts that are related to "heart attack", but whose name is not similar to "heart attack".
   *       Example: "heart attack" -> "myocardial infarction", this avoids false positives like "heart burn", etc
   *
   * 1. t
   * 1.a. find concepts whose associated synonyms matches the search_phrase. Result may contain repeated concepts, as a concept can have multiple synonyms.
   * 1.b. Include a score column, which is
   *        - positive when associated synonym is more similar to search_phrase than the concept name.
   *        - zero when the synonym is equally similar to the concept name and the search phrase.
   *        - negative when synonym is more similar to the concept name than the search phrase.
   *
   * 2. grouped_t
   * 2.a. group the previous result by concept name, and calculate the average score for each concept.
   * 2.b. include concepts whose average score is more than zero. This means that these concepts have more
   *      synonyms that are more similar to the search phrase than to the concept name.
   *
   *
   *    plainto_tsquery_or: custom function that transforms a string into a tsquery, but using OR as the operator instead of AND.
   *    OTOH, to_tsquery builtin function converts plain text to tsquery using AND operator as separator
   *
   *    ts_rank_cd: builtin function that ranks the result of a tsquery based on the number of matching terms and their position in the text.
   *
   * 3. final result
   * 3.a. (When this function was developed,) concept table contained ICD10 and SNOMED concepts. concept_metadata table is a materialized view created only for ICD10 concepts.
   *      Results from grouped_t includes concepts from both ICD10 and SNOMED vocabularies. But we only need synonyms that are related to ICD10 concepts.
   *      This is because the synonyms results returned here will be used as search queries against the concept_metadata table, which only contains ICD10 concepts.
   *
   *      This last stage includes a filter to eliminate grouped_t concept namess that might have an average score above zero but are not contextually relevant enough to the ICD10 concept names.
   *      A results from the previous stage is only included in the final result if there exists some ICD 10 concept whose name is similar to the concept name of the result. This similarity is calculated by the ts_rank_cd function.
   */
  return Prisma.sql`
    with t as (
      select
        cs.concept_id,
        cs.concept_synonym_name,
        c.concept_name,
        similarity(cs.concept_synonym_name, ${search_phrase}) - 
        similarity(cs.concept_synonym_name, c.concept_name) as score
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
  /**
   * Finds all concepts with a path that is a descendant or equal to the path of the concept with the given code.
   * @param {string} code - The code of the concept to find descendants for.
   *
   * @return {import('@prisma/client').Prisma.Sql}
   */
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
  // searchTreeSql,
  synonymsSql,
  descendantsSql,
};
