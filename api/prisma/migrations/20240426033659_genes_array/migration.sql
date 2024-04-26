/*
  Warnings:

  - You are about to drop the column `gene1_id` on the `annotation` table. All the data in the column will be lost.
  - You are about to drop the column `gene2_id` on the `annotation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_gene1_id_fkey";

-- DropForeignKey
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_gene2_id_fkey";

-- DropIndex
DROP INDEX "annotation_gene1_id_gene2_id_idx";

-- AlterTable
ALTER TABLE "annotation" DROP COLUMN "gene1_id",
DROP COLUMN "gene2_id",
ADD COLUMN     "gene_ids" INTEGER[];
