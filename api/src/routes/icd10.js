const express = require('express');
const { Prisma, PrismaClient } = require('@prisma/client');
const { query } = require('express-validator');
// const createHttpError = require('http-errors');
const asyncHandler = require('../middleware/asyncHandler');
// const { accessControl } = require('../middleware/auth');
const { validate } = require('../middleware/validators');
const icd10Service = require('../services/icd10');
// const esClient = require('../elasticsearch');

// const isPermittedTo = accessControl('cohort');
const router = express.Router();
const prisma = new PrismaClient();

// router.get(
//   '/search/tree',
//   asyncHandler(async (req, res, next) => {
//     // #swagger.tags = ['ICD10']
//     const { keyword } = req.query;
//     if (!keyword) {
//       return res.json([]);
//     }

//     // TODO
//     // handle case where keyword is a code
//     // handle edge cases where no rows are returned
//     // handle case where there are a lot of rows returned

//     const sql = icd10Service.searchTreeSql({ search_phrase: keyword });
//     const nodes = await prisma.$queryRaw(sql);

//     // if (nodes.length === 800) {
//     //   next(createHttpError(403, 'Too many results'));
//     //   return;
//     // }

//     if (nodes.length === 0) {
//       next(createHttpError(404, 'No results found.'));
//       return;
//     }

//     const tree = {
//       children: {},
//     };
//     nodes.forEach((node) => {
//       const { concept_id, path } = node;
//       let current = tree;
//       const _path = path.split('.').slice(0, -1).map((id) => parseInt(id, 10));
//       _path.forEach((parent) => {
//         if (!current.children[parent]) {
//           current.children[parent] = { children: {} };
//         }
//         current = current.children[parent];
//       });
//       // node is at current.children[node.concept_id]
//       // update current.children[node.concept_id] with node value while keeping children
//       current.children[concept_id] = {
//         ...node,
//         children: current.children[concept_id]?.children || {},
//       };
//     });

//     function format(node) {
//       const {
//         children,
//         concept_id,
//         concept_name,
//         domain_id,
//         vocabulary_id,
//         concept_class_id,
//         concept_code,
//         path,
//         is_a_search_result,
//       } = node;
//       const formattedChildren = Object.values(children)
//         .map(format)
//         .sort((a, b) => {
//           try {
//             if (a.concept_code == null) { return -1; }
//             return a.concept_code.localeCompare(b.concept_code);
//           } catch (e) {
//             console.error(a, b); // todo:
//             /**
//            * error because of this:
//            * {
//   concept_id: undefined,
//   concept_name: undefined,
//   domain_id: undefined,
//   vocabulary_id: undefined,
//   concept_class_id: undefined,
//   concept_code: undefined,
//   path: undefined,
//   is_a_search_result: undefined,
//   children: [
//     {
//       concept_id: 42616467,
//       concept_name: 'Reiter disease, ankle and foot',
//       domain_id: 'Condition',
//       vocabulary_id: 'ICD10',
//       concept_class_id: 'ICD10 code',
//       concept_code: 'M02.37',
//       path: '40474991.40475131.40475132.40475131.45548234.45548234.45572320.42616467',
//       is_a_search_result: true
//     }
//   ]
// }
//            */
//             throw e;
//           }
//         });
//       return {
//         concept_id,
//         concept_name,
//         domain_id,
//         vocabulary_id,
//         concept_class_id,
//         concept_code,
//         path,
//         is_a_search_result,
//         ...(formattedChildren.length > 0 ? { children: formattedChildren } : {}),
//       };
//     }

//     // remove non-leaf nodes if it is not a match and none of thier descendants are matches
//     function prune(node) {
//       const { children } = node;
//       // if children is null - leaf node, keep it regardless of match
//       if (!children) return node;

//       // recursively prune children
//       const pruned_children = children.map(prune).filter(Boolean);

//       // if pruned children is an empty array return null
//       if (pruned_children.length === 0) return;

//       const some_children_match = pruned_children.some(
//         (n) => n.is_a_search_result || n.some_children_match,
//       );
//       // if none of the children are matches, return null
//       if (!node.is_a_search_result && !some_children_match) return;

//       return {
//         ...node,
//         children: pruned_children,
//         some_children_match,
//       };
//     }

//     const formattedTree = format(tree);
//     const prunedTree = prune(formattedTree);

//     res.json(prunedTree.children);
//   }),
// );

// return all concept names that are similar to the search_phrase
router.get(
  '/synonyms',
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['ICD10']
    const { keyword } = req.query;
    if (!keyword) {
      return res.json([]);
    }
    const sql = icd10Service.synonymsSql({ search_phrase: keyword });
    // console.log(sql.sql, sql.values);
    const rows = await prisma.$queryRaw(sql);
    res.json(rows);
  }),
);

router.get(
  '/search/tree2',
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['ICD10']
    const { keyword } = req.query;
    if (!keyword) {
      return res.json([]);
    }
    let sql = Prisma.sql`
    with matches_and_parents as (
      select distinct cast(unnest(string_to_array(ltree2text(path), '.')) as integer) as id
      from concept c
      join concept_metadata cm on cm.id = c.concept_id
      where vocabulary_id = 'ICD10CM' 
      and cm.textsearchable_index_col @@ websearch_to_tsquery('english', ${keyword})
    )
    select c.*, cm.path from concept c
    join matches_and_parents sr on c.concept_id = sr.id
    join concept_metadata cm on cm.id = c.concept_id
  `;
    const rows = await prisma.$queryRaw(sql);
    if (rows.length > 0) {
      res.json({
        matches: rows,
        match_type: 'strict',
      });
      return;
    }

    // query yielded no results
    // relax the search criteria
    sql = Prisma.sql`
    with matches_and_parents as (
      select distinct cast(unnest(string_to_array(ltree2text(path), '.')) as integer) as id
      from concept c
      join concept_metadata cm on cm.id = c.concept_id
      where vocabulary_id = 'ICD10CM' 
      and cm.textsearchable_index_col @@ plainto_tsquery_or(${keyword})
    )
    select c.*, cm.path from concept c
    join matches_and_parents sr on c.concept_id = sr.id
    join concept_metadata cm on cm.id = c.concept_id
  `;
    const fallback_rows = await prisma.$queryRaw(sql);
    res.json({
      matches: fallback_rows,
      match_type: 'fallback',
    });
  }),
);

// router.get('/search/tree2/elasticsearch', asyncHandler(async (req, res, next) => {
//   const { keyword } = req.query;
//   if (!keyword) {
//     return res.json([]);
//   }
//   const esResult = await esClient.search({
//     index: 'concepts',
//     body: {
//       query: {
//         match: {
//           name: {
//             query: keyword,
//             fuzziness: 'AUTO',
//           },
//         },
//       },
//       size: 25, // Set the size to a large number to retrieve all matches
//       // min_score: 5.0,
//     },
//   });

//   const searchResults = esResult.hits.hits
//     .map((hit) => ({ id: hit._source.id, score: hit._score }));

//   if (searchResults.length === 0) {
//     return res.json([]);
//   }

//   const ids = searchResults.map((hit) => hit.id); // [45562342, 45594900, 45563241, 45541583];
//   // [13.910966, 10.795364, 8.769578, 7.589265];
//   const scores = searchResults.map((hit) => hit.score);

//   const ids_sql = Prisma.sql`ARRAY[${Prisma.join(ids, ', ')}]::int[]`;
//   const scores_sql = Prisma.sql`ARRAY[${Prisma.join(scores, ', ')}]::float[]`;

//   // where concept_class_id in ('ICD10 Hierarchy', 'ICD10 code')
//   const sql = Prisma.sql`
//     with matches as (
//       select unnest(${ids_sql}::int[]) as id, unnest(${scores_sql}::float[]) as score
//     ),
//     matches_and_parents as (
//       select distinct cast(unnest(string_to_array(ltree2text(path), '.')) as integer) as id
//       from concept c
//       join concept_metadata cm on cm.id = c.concept_id
//       join matches m on m.id = c.concept_id
//       where vocabulary_id = 'ICD10'
//       and concept_class_id in ('ICD10 Hierarchy', 'ICD10 code')
//     )
//     select c.*, cm.path, m.score
//     from concept c
//     join matches_and_parents sr on c.concept_id = sr.id
//     join concept_metadata cm on cm.id = c.concept_id
//     left join matches m on m.id = c.concept_id
//     where concept_class_id in ('ICD10 Hierarchy', 'ICD10 code')
//     order by score desc nulls last
//   `;
//   const rows = await prisma.$queryRaw(sql);
//   res.json({
//     matches: rows,
//     match_type: 'strict',
//   });
// }));

// retrieve all concepts that are descendants of the concept identified by the given code (all levels)
router.get(
  '/descendants/:code',
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['ICD10']
  // #swagger.summary = 'Get ICD10 descendants.'
    const { code } = req.params;
    const sql = icd10Service.descendantsSql({ code });
    const rows = await prisma.$queryRaw(sql);
    res.json(rows);
  }),
);

// autocompletes ICD10 codes. ex: starts_with is 'E1' -> returns codes like 'E11', 'E116', 'E117'
router.get(
  '/typeahead',
  validate([
    query('starts_with').isString().notEmpty(),
    query('limit').default(5).isInt({ min: 1, max: 10000 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['ICD10']
    const rows = await prisma.$queryRaw`
      select c.concept_code, c.concept_name
      from concept c
      where c.vocabulary_id = 'ICD10CM' and c.concept_class_id in ('3-char nonbill code', '3-char billing code')
      and c.concept_code ilike ${`${req.query.starts_with}%`}
      order by c.concept_class_id desc, c.concept_code asc
      limit ${req.query.limit}
    `;
    res.json(rows);
  }),
);

// get concept data for given codes
router.get(
  '/',
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['ICD10']
  // #swagger.summary = 'Get ICD10 codes.'
    const codes = req.query.codes.split(',');
    const sql = Prisma.sql`
    SELECT c.*, cm.path
    FROM concept c
    JOIN concept_metadata cm ON c.concept_id = cm.id
    WHERE vocabulary_id = 'ICD10CM'
    and concept_code in (${Prisma.join(codes, ', ')})
  `;
    const rows = await prisma.$queryRaw(sql);
    res.json(rows);
  }),
);

module.exports = router;
