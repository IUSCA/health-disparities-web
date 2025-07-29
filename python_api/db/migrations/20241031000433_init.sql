-- migrate:up
CREATE TABLE "subject" (
    "id" INTEGER PRIMARY KEY
);

CREATE TABLE "demographic" (
    "sid" INTEGER PRIMARY KEY,
    "age" INTEGER,
    "gender" TEXT,
    "race" TEXT,
    "ethnicity" TEXT,
    "race_ethnicity" TEXT,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE "encounter" (
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

CREATE TABLE "dx" (
    "sid" INTEGER NOT NULL,
    "encounter_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("concept_id") REFERENCES "concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("sid", "encounter_id", "concept_id")
);


CREATE TABLE "procedure" (
    "sid" INTEGER NOT NULL,
    "encounter_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,

    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("concept_id") REFERENCES "concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,

    PRIMARY KEY ("sid", "encounter_id", "concept_id")
);

--CREATE TABLE "lab" (
--    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
--    "name" TEXT,
--    "component" TEXT,
--    "ord_value" TEXT,
--    "reference_low" TEXT,
--    "reference_high" TEXT,
--    "reference_unit" TEXT,
--    "result_year" INTEGER,
--    "sid" INTEGER NOT NULL,
--    "encounter_id" INTEGER,
--    "order_id" INTEGER,
--
--    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
--);
--
--
--
--
--CREATE TABLE "meds_order" (
--    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
--    "name" TEXT,
--    "simple_name" TEXT,
--    "order_status" TEXT,
--    "order_year" INTEGER,
--    "sid" INTEGER NOT NULL,
--    "encounter_id" INTEGER,
--    "order_id" INTEGER,
--    "sig" TEXT, -- signa: instructions for taking the medication
--
--    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
--);
--
--CREATE TABLE "other_order" (
--    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
--    "order_status" TEXT,
--    "order_year" INTEGER,
--    "order_type" TEXT,
--    "ordered" TEXT,
--    "proc_id" INTEGER,
--    "sid" INTEGER NOT NULL,
--    "encounter_id" INTEGER,
--    "order_id" INTEGER,
--
--    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
--);
--
--
--
--
--CREATE TABLE "surgery" (
--    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
--    "procedure" TEXT,
--    "department" TEXT,
--    "wound_class" TEXT,
--    "sid" INTEGER NOT NULL,
--    "encounter_id" INTEGER,
--    "surgery_id" INTEGER,
--
--    FOREIGN KEY ("sid") REFERENCES "subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
--);



-- migrate:down
--DROP TABLE "surgery";
DROP TABLE "procedure";
--DROP TABLE "other_order";
--DROP TABLE "meds_order";
DROP TABLE "encounter";
DROP TABLE "dx";
DROP TABLE concept;
--DROP TABLE "lab";
DROP TABLE "demographic";
DROP TABLE "subject";
