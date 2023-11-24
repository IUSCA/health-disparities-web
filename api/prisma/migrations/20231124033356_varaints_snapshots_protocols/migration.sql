-- AlterTable
ALTER TABLE "participant" ADD COLUMN     "disenroll_snapshot_id" INTEGER,
ADD COLUMN     "enroll_snapshot_id" INTEGER;

-- CreateTable
CREATE TABLE "variant" (
    "chr" SMALLINT NOT NULL,
    "position" BIGINT NOT NULL,
    "ref" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "genotype" SMALLINT[],
    "allele_count" INTEGER,
    "allele_number" INTEGER,
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

    CONSTRAINT "variant_pkey" PRIMARY KEY ("chr","position","ref","alt")
) PARTITION BY LIST (chr);

CREATE TABLE IF NOT EXISTS variant_default_partition PARTITION OF variant
    DEFAULT;


CREATE TABLE IF NOT EXISTS variant_chromosome_01 PARTITION OF variant
    FOR VALUES IN (1);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_02 PARTITION OF variant
    FOR VALUES IN (2);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_03 PARTITION OF variant
    FOR VALUES IN (3);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_04 PARTITION OF variant
    FOR VALUES IN (4);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_05 PARTITION OF variant
    FOR VALUES IN (5);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_06 PARTITION OF variant
    FOR VALUES IN (6);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_07 PARTITION OF variant
    FOR VALUES IN (7);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_08 PARTITION OF variant
    FOR VALUES IN (8);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_09 PARTITION OF variant
    FOR VALUES IN (9);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_10 PARTITION OF variant
    FOR VALUES IN (10);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_11 PARTITION OF variant
    FOR VALUES IN (11);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_12 PARTITION OF variant
    FOR VALUES IN (12);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_13 PARTITION OF variant
    FOR VALUES IN (13);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_14 PARTITION OF variant
    FOR VALUES IN (14);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_15 PARTITION OF variant
    FOR VALUES IN (15);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_16 PARTITION OF variant
    FOR VALUES IN (16);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_17 PARTITION OF variant
    FOR VALUES IN (17);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_18 PARTITION OF variant
    FOR VALUES IN (18);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_19 PARTITION OF variant
    FOR VALUES IN (19);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_20 PARTITION OF variant
    FOR VALUES IN (20);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_21 PARTITION OF variant
    FOR VALUES IN (21);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_22 PARTITION OF variant
    FOR VALUES IN (22);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_23 PARTITION OF variant
    FOR VALUES IN (23);
    

CREATE TABLE IF NOT EXISTS variant_chromosome_24 PARTITION OF variant
    FOR VALUES IN (24);


-- CreateTable
CREATE TABLE "snapshot" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "author_id" INTEGER,

    CONSTRAINT "snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author_id" INTEGER,

    CONSTRAINT "protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_protocol" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "protocol_id" INTEGER NOT NULL,

    CONSTRAINT "user_protocol_pkey" PRIMARY KEY ("user_id","protocol_id")
);

-- CreateTable
CREATE TABLE "participant_protocol" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participant_id" INTEGER NOT NULL,
    "protocol_id" INTEGER NOT NULL,

    CONSTRAINT "participant_protocol_pkey" PRIMARY KEY ("participant_id","protocol_id")
);

-- CreateIndex
CREATE INDEX "variant_genes_idx" ON "variant"("genes");

-- CreateIndex
CREATE INDEX "variant_cln_sig_idx" ON "variant"("cln_sig");

-- CreateIndex
CREATE INDEX "snapshot_date_idx" ON "snapshot"("date");

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_enroll_snapshot_id_fkey" FOREIGN KEY ("enroll_snapshot_id") REFERENCES "snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_disenroll_snapshot_id_fkey" FOREIGN KEY ("disenroll_snapshot_id") REFERENCES "snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol" ADD CONSTRAINT "protocol_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_protocol" ADD CONSTRAINT "user_protocol_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_protocol" ADD CONSTRAINT "user_protocol_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_protocol" ADD CONSTRAINT "participant_protocol_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_protocol" ADD CONSTRAINT "participant_protocol_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
