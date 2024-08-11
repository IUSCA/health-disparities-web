-- CreateTable
CREATE TABLE "concept" (
    "concept_id" INTEGER NOT NULL,
    "concept_name" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "concept_class_id" TEXT NOT NULL,
    "standard_concept" TEXT,
    "concept_code" TEXT NOT NULL,
    "valid_start_date" TIMESTAMP(3),
    "valid_end_date" TIMESTAMP(3),
    "invalid_reason" TEXT,

    CONSTRAINT "concept_pkey" PRIMARY KEY ("concept_id")
);

-- CreateTable
CREATE TABLE "concept_relationship" (
    "concept_id_1" INTEGER NOT NULL,
    "concept_id_2" INTEGER NOT NULL,
    "relationship_id" TEXT NOT NULL,
    "valid_start_date" TIMESTAMP(3),
    "valid_end_date" TIMESTAMP(3),
    "invalid_reason" TEXT,

    CONSTRAINT "concept_relationship_pkey" PRIMARY KEY ("concept_id_1","concept_id_2","relationship_id")
);

-- CreateTable
CREATE TABLE "concept_synonym" (
    "concept_id" INTEGER NOT NULL,
    "concept_synonym_name" TEXT NOT NULL,
    "language_concept_id" INTEGER NOT NULL,

    CONSTRAINT "concept_synonym_pkey" PRIMARY KEY ("concept_id","concept_synonym_name","language_concept_id")
);

-- CreateIndex
CREATE INDEX "concept_vocabulary_id_idx" ON "concept"("vocabulary_id");

-- CreateIndex
CREATE INDEX "concept_concept_class_id_idx" ON "concept"("concept_class_id");

-- CreateIndex
CREATE INDEX "concept_concept_code_idx" ON "concept"("concept_code");

-- CreateIndex
CREATE INDEX "concept_synonym_concept_id_idx" ON "concept_synonym"("concept_id");

-- AddForeignKey
ALTER TABLE "concept_relationship" ADD CONSTRAINT "concept_relationship_concept_id_1_fkey" FOREIGN KEY ("concept_id_1") REFERENCES "concept"("concept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_relationship" ADD CONSTRAINT "concept_relationship_concept_id_2_fkey" FOREIGN KEY ("concept_id_2") REFERENCES "concept"("concept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_synonym" ADD CONSTRAINT "concept_synonym_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concept"("concept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure ltree extension is enabled
CREATE EXTENSION IF NOT EXISTS ltree;

-- Matrialized Views for full text search for concept_name
create materialized view if not exists concept_metadata as WITH RECURSIVE ancestors AS (
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
        c1.vocabulary_id = 'ICD10'
        AND c2.vocabulary_id = 'ICD10'
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
        c2.vocabulary_id = 'ICD10'
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
    join concept c on c.concept_id = nodes.id;

-- CreateIndex
CREATE INDEX concept_metadata_textsearch_idx ON concept_metadata USING GIN (textsearchable_index_col);

-- Matrialized Views for full text search for concept_synonym_name
create materialized view if not exists concept_synonym_metadata as
select
    cs.concept_id,
    cs.concept_synonym_name,
    to_tsvector(
        'english',
        coalesce(cs.concept_synonym_name, '')
    ) as textsearchable_index_col
from
    concept_synonym cs;

-- CreateIndex
CREATE INDEX concept_synonym_metadata_textsearch_idx ON concept_synonym_metadata USING GIN (textsearchable_index_col);