CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
CREATE TABLE IF NOT EXISTS "subject" (
    "id" INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS "demographic" (
    "sid" INTEGER PRIMARY KEY,
    "age" INTEGER,
    "gender" TEXT,
    "race" TEXT,
    "ethnicity" TEXT,
    "race_ethnicity" TEXT,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "encounter" (
    "id" INTEGER PRIMARY KEY,
    "type" TEXT,
    "year" INTEGER,
    "sid" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE concept (
    id INTEGER PRIMARY KEY,
    type TEXT,
    name TEXT,
    code TEXT,
    code_system TEXT,

    UNIQUE (type, code, code_system)
);
CREATE TABLE IF NOT EXISTS "dx" (
    "sid" INTEGER NOT NULL,
    "encounter_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("concept_id") REFERENCES "concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("sid", "encounter_id", "concept_id")
);
CREATE TABLE IF NOT EXISTS "procedure" (
    "sid" INTEGER NOT NULL,
    "encounter_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("concept_id") REFERENCES "concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("sid", "encounter_id", "concept_id")
);
CREATE TABLE IF NOT EXISTS "cohort_definition" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "cohort" (
    "cohort_definition_id" INTEGER NOT NULL,
    "sid" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("cohort_definition_id") REFERENCES "cohort_definition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("cohort_definition_id", "sid")
);
CREATE INDEX "demographic_age_idx" ON "demographic" ("age");
CREATE INDEX "demographic_gender_idx" ON "demographic" ("gender");
CREATE INDEX "demographic_race_ethnicity_idx" ON "demographic" ("race_ethnicity");
CREATE INDEX "encounter_sid_idx" ON "encounter" ("sid");
CREATE INDEX "dx_concept_id_idx" ON "dx" ("concept_id");
CREATE INDEX "dx_sid_idx" ON "dx" ("sid");
CREATE INDEX "procedure_concept_id_idx" ON "procedure" ("concept_id");
CREATE INDEX "procedure_sid_idx" ON "procedure" ("sid");
CREATE INDEX cohort_sid_idx ON "cohort" ("sid");
CREATE INDEX cohort_cohort_definition_id_idx ON "cohort" ("cohort_definition_id");
CREATE INDEX encounter_sid_type_idx ON encounter (sid, type);
CREATE INDEX "concept_name_type_idx" ON "concept" ("name", "type");
CREATE TABLE IF NOT EXISTS "intervention" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "intervention_concept" (
    "intervention_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,

    FOREIGN KEY ("intervention_id") REFERENCES "intervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("concept_id") REFERENCES "concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("intervention_id", "concept_id")
);
CREATE TABLE analysis_result (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_type TEXT NOT NULL,
    cohort_id INTEGER NOT NULL,
    intervention_id INTEGER NOT NULL,
    result TEXT NOT NULL, -- JSON
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cohort_id) REFERENCES cohort (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (intervention_id) REFERENCES intervention (id) ON DELETE CASCADE ON UPDATE CASCADE
);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20241031000433'),
  ('20241101142333'),
  ('20241102041436'),
  ('20241130194931');
