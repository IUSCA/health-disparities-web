/*
  Warnings:

  - You are about to drop the `vcf_subject` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[genotype_idx]` on the table `participant` will be added. If there are existing duplicate values, this will fail.
  - Made the column `enroll_snapshot_id` on table `participant` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "participant" DROP CONSTRAINT "participant_enroll_snapshot_id_fkey";

-- AlterTable
ALTER TABLE "participant" ADD COLUMN     "genotype_idx" INTEGER,
ALTER COLUMN "enroll_snapshot_id" SET NOT NULL;

-- DropTable
DROP TABLE "vcf_subject";

-- CreateTable
CREATE TABLE "genotype_set" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "source_id" INTEGER NOT NULL,
    "snapshot_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "genotype_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genotype_file" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "chr" SMALLINT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "md5" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "set_id" INTEGER NOT NULL,

    CONSTRAINT "genotype_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genotype_sample" (
    "sample" TEXT NOT NULL,
    "set_id" INTEGER NOT NULL,
    "participant_id" INTEGER,
    "description" TEXT,

    CONSTRAINT "genotype_sample_pkey" PRIMARY KEY ("set_id","sample")
);

-- CreateTable
CREATE TABLE "phenotype_file" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "md5" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "snapshot_id" INTEGER NOT NULL,

    CONSTRAINT "phenotype_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genotype_set_name_snapshot_id_source_id_key" ON "genotype_set"("name", "snapshot_id", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "genotype_file_name_set_id_key" ON "genotype_file"("name", "set_id");

-- CreateIndex
CREATE UNIQUE INDEX "participant_genotype_idx_key" ON "participant"("genotype_idx");

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_enroll_snapshot_id_fkey" FOREIGN KEY ("enroll_snapshot_id") REFERENCES "snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genotype_set" ADD CONSTRAINT "genotype_set_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genotype_set" ADD CONSTRAINT "genotype_set_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genotype_file" ADD CONSTRAINT "genotype_file_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "genotype_set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genotype_sample" ADD CONSTRAINT "genotype_sample_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "genotype_set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genotype_sample" ADD CONSTRAINT "genotype_sample_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phenotype_file" ADD CONSTRAINT "phenotype_file_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
