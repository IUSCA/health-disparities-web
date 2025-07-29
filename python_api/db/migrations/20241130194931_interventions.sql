-- migrate:up
CREATE TABLE "intervention" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "intervention_concept" (
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

-- migrate:down
DROP TABLE "intervention_concept";

DROP TABLE "analysis_result";

DROP TABLE "intervention";

