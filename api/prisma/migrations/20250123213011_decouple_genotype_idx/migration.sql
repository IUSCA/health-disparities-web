/*
  Warnings:

  - You are about to drop the column `genotype_idx` on the `participant` table. All the data in the column will be lost.
  - Added the required column `is_imputed` to the `genotype_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_imputed` to the `genotype_stats_snapshot_1` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_imputed` to the `variant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "participant_genotype_idx_key";

-- AlterTable
-- PostgreSQL will propagate the new column automatically to all child partitions.
ALTER TABLE "genotype_stats" ADD COLUMN     "is_imputed" BOOLEAN NOT NULL;

-- AlterTable
-- ALTER TABLE "genotype_stats_snapshot_1" ADD COLUMN     "is_imputed" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "variant" ADD COLUMN     "is_imputed" BOOLEAN NOT NULL;

-- drop view
-- dropping view because it uses p.* to select all columns from participant table
-- we need to drop and recreate the view
DROP VIEW participants_per_snapshot;

-- AlterTable
ALTER TABLE "participant" DROP COLUMN "genotype_idx";

-- CreateTable
CREATE TABLE "participant_genotype" (
    "id" SERIAL NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "source_id" INTEGER NOT NULL,
    "genotype_idx" INTEGER NOT NULL,

    CONSTRAINT "participant_genotype_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participant_genotype_participant_id_source_id_genotype_idx_key" ON "participant_genotype"("participant_id", "source_id", "genotype_idx");

-- AddForeignKey
ALTER TABLE "participant_genotype" ADD CONSTRAINT "participant_genotype_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_genotype" ADD CONSTRAINT "participant_genotype_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- recreate view
create
or replace view participants_per_snapshot as
select
  s.id as snapshot_id,
  p.*
from
  participant p
  join "snapshot" enroll on p.enroll_snapshot_id = enroll.id
  left join "snapshot" disenroll on p.disenroll_snapshot_id = disenroll.id
  join "snapshot" s on enroll."timestamp" <= s.timestamp
  and (
    disenroll."timestamp" is null
    or disenroll."timestamp" > s."timestamp"
  );
