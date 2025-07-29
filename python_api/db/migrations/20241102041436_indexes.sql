-- migrate:up
CREATE INDEX "demographic_age_idx" ON "demographic" ("age");
CREATE INDEX "demographic_gender_idx" ON "demographic" ("gender");
CREATE INDEX "demographic_race_ethnicity_idx" ON "demographic" ("race_ethnicity");

CREATE INDEX "encounter_sid_idx" ON "encounter" ("sid");
CREATE INDEX "encounter_sid_type_idx" ON "encounter" ("sid", "type");

CREATE INDEX "dx_concept_id_idx" ON "dx" ("concept_id");
CREATE INDEX "dx_sid_idx" ON "dx" ("sid");

CREATE INDEX "procedure_concept_id_idx" ON "procedure" ("concept_id");
CREATE INDEX "procedure_sid_idx" ON "procedure" ("sid");

CREATE INDEX "concept_name_type_idx" ON "concept" ("name", "type");

-- migrate:down
DROP INDEX "demographic_age_idx";
DROP INDEX "demographic_gender_idx";
DROP INDEX "demographic_race_ethnicity_idx";

DROP INDEX "encounter_sid_idx";
DROP INDEX "encounter_sid_type_idx";

DROP INDEX "dx_concept_id_idx";
DROP INDEX "dx_sid_idx";

DROP INDEX "procedure_concept_id_idx";
DROP INDEX "procedure_sid_idx";

DROP INDEX "concept_name_type_idx";