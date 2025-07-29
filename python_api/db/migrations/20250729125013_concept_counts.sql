-- migrate:up
CREATE TABLE IF NOT EXISTS "concept_counts" (
    "concept_id" INTEGER PRIMARY KEY,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("concept_id") REFERENCES "concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "concept_counts_concept_id_idx" ON "concept_counts" ("concept_id");
-- CREATE INDEX "concept_counts_participant_count_idx" ON "concept_counts" ("participant_count");

-- Populate the table with initial counts
-- INSERT INTO concept_counts (concept_id, participant_count, updated_at)
-- SELECT t.concept_id, count(*) as count, CURRENT_TIMESTAMP
-- FROM (
--     SELECT DISTINCT sid, concept_id FROM dx
-- ) t
-- GROUP BY t.concept_id;

-- INSERT INTO concept_counts (concept_id, participant_count, updated_at)
-- SELECT t.concept_id, count(*) as count, CURRENT_TIMESTAMP
-- FROM (
--     SELECT DISTINCT sid, concept_id FROM "procedure"
-- ) t
-- GROUP BY t.concept_id;

-- migrate:down
DROP INDEX IF EXISTS "concept_counts_concept_id_idx";
-- DROP INDEX IF EXISTS "concept_counts_participant_count_idx";
DROP TABLE IF EXISTS "concept_counts";

