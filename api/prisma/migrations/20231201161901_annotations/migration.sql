-- CreateTable
CREATE TABLE "annotation" (
    "chr" SMALLINT NOT NULL,
    "position" BIGINT NOT NULL,
    "ref" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "source_id" INTEGER NOT NULL,
    "func" TEXT,
    "genes" TEXT,
    "exonic_func" TEXT,
    "aa_change" TEXT,
    "af_afr" DOUBLE PRECISION,
    "af_sas" DOUBLE PRECISION,
    "af_amr" DOUBLE PRECISION,
    "af_eas" DOUBLE PRECISION,
    "af_nfe" DOUBLE PRECISION,
    "af_fin" DOUBLE PRECISION,
    "af_asj" DOUBLE PRECISION,
    "af_oth" DOUBLE PRECISION,
    "cln_allele_id" INTEGER,
    "cln_cond" TEXT,
    "cln_dis_db" TEXT,
    "cln_rev_stat" TEXT,
    "cln_sig" TEXT,

    CONSTRAINT "annotation_pkey" PRIMARY KEY ("chr","position","ref","alt","source_id")
) PARTITION BY LIST (chr);

CREATE TABLE IF NOT EXISTS annotation_default_partition PARTITION OF annotation
    DEFAULT;


CREATE TABLE IF NOT EXISTS annotation_chromosome_01 PARTITION OF annotation
    FOR VALUES IN (1);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_02 PARTITION OF annotation
    FOR VALUES IN (2);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_03 PARTITION OF annotation
    FOR VALUES IN (3);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_04 PARTITION OF annotation
    FOR VALUES IN (4);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_05 PARTITION OF annotation
    FOR VALUES IN (5);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_06 PARTITION OF annotation
    FOR VALUES IN (6);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_07 PARTITION OF annotation
    FOR VALUES IN (7);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_08 PARTITION OF annotation
    FOR VALUES IN (8);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_09 PARTITION OF annotation
    FOR VALUES IN (9);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_10 PARTITION OF annotation
    FOR VALUES IN (10);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_11 PARTITION OF annotation
    FOR VALUES IN (11);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_12 PARTITION OF annotation
    FOR VALUES IN (12);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_13 PARTITION OF annotation
    FOR VALUES IN (13);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_14 PARTITION OF annotation
    FOR VALUES IN (14);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_15 PARTITION OF annotation
    FOR VALUES IN (15);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_16 PARTITION OF annotation
    FOR VALUES IN (16);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_17 PARTITION OF annotation
    FOR VALUES IN (17);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_18 PARTITION OF annotation
    FOR VALUES IN (18);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_19 PARTITION OF annotation
    FOR VALUES IN (19);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_20 PARTITION OF annotation
    FOR VALUES IN (20);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_21 PARTITION OF annotation
    FOR VALUES IN (21);
    

CREATE TABLE IF NOT EXISTS annotation_chromosome_22 PARTITION OF annotation
    FOR VALUES IN (22);
    
-- chromosome XX or X
CREATE TABLE IF NOT EXISTS annotation_chromosome_23 PARTITION OF annotation
    FOR VALUES IN (23);
    
-- chromosome XY or Y
CREATE TABLE IF NOT EXISTS annotation_chromosome_24 PARTITION OF annotation
    FOR VALUES IN (24);


-- AddForeignKey
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
