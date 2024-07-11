/*
  Warnings:

  - You are about to drop the column `gene1_id` on the `annotation` table. All the data in the column will be lost.
  - You are about to drop the column `gene2_id` on the `annotation` table. All the data in the column will be lost.
  - The primary key for the `gene` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `gene` table. All the data in the column will be lost.

*/
-- Drop dependent view
DROP VIEW "gt_stats_annotations";

-- DropForeignKey
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_gene1_id_fkey";

-- DropForeignKey
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_gene2_id_fkey";

-- DropIndex
DROP INDEX "annotation_gene1_id_gene2_id_idx";

-- DropIndex
DROP INDEX "gene_name_key";

-- AlterTable
ALTER TABLE "annotation" DROP COLUMN "gene1_id",
DROP COLUMN "gene2_id",
ADD COLUMN     "genes" TEXT[];

-- AlterTable
ALTER TABLE "gene" DROP CONSTRAINT "gene_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "gene_pkey" PRIMARY KEY ("name");

-- Create View
CREATE VIEW gt_stats_annotations AS
select a.*, 
	gs.snapshot_id,
	gs.source_id,
	gs.protocol_id,
	gs.phase,
	gs.missing,
	gs.c0,
	gs.c1,
	gs.c2,
	gs.c3,
	gs.allele_number,
	gs.allele_count,
	gs.allele_freq
from 
	genotype_stats gs 
	join annotation a on gs.chr = a.chr and gs."position" = a."position" and gs."ref" = a."ref" and gs.alt  = a.alt;