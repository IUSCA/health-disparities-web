/*
  Warnings:

  - You are about to drop the column `cln_cond` on the `annotation` table. All the data in the column will be lost.
  - You are about to drop the column `genes` on the `annotation` table. All the data in the column will be lost.

*/
-- DropView
DROP VIEW "variant_annotation";

-- DropIndex
DROP INDEX "annotation_cln_sig_idx";

-- DropIndex
DROP INDEX "annotation_exonic_func_idx";

-- DropIndex
DROP INDEX "annotation_func_idx";

-- DropIndex
DROP INDEX "annotation_genes_idx";

-- AlterTable
ALTER TABLE "annotation" DROP COLUMN "cln_cond",
DROP COLUMN "genes",
ADD COLUMN     "cln_dn" TEXT,
ADD COLUMN     "cln_geneinfo" TEXT,
ADD COLUMN     "cln_hgvs" TEXT,
ADD COLUMN     "cln_mc" TEXT,
ADD COLUMN     "cln_vc" TEXT,
ADD COLUMN     "cln_vcso" TEXT,
ADD COLUMN     "gene1_id" INTEGER,
ADD COLUMN     "gene2_id" INTEGER;

-- CreateTable
CREATE TABLE "gene" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "gene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gene_name_key" ON "gene"("name");

-- CreateIndex
CREATE INDEX "annotation_gene1_id_gene2_id_idx" ON "annotation"("gene1_id", "gene2_id");

-- AddForeignKey
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_gene1_id_fkey" FOREIGN KEY ("gene1_id") REFERENCES "gene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_gene2_id_fkey" FOREIGN KEY ("gene2_id") REFERENCES "gene"("id") ON DELETE SET NULL ON UPDATE CASCADE;
