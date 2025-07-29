-- migrate:up
CREATE TABLE "cohort_definition" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

CREATE TABLE "cohort" (
    "cohort_definition_id" INTEGER NOT NULL,
    "sid" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("cohort_definition_id") REFERENCES "cohort_definition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("cohort_definition_id", "sid")
);

-- migrate:down
DROP TABLE "cohort";
DROP TABLE "cohort_definition";
