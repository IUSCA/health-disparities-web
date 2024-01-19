/*
  Warnings:

  - The primary key for the `annotation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `source_id` on the `annotation` table. All the data in the column will be lost.

*/
-- redefine view
CREATE OR REPLACE VIEW variant_annotation AS
SELECT
  v."chr",
  v."position",
  v."ref",
  v.alt,
  v.source_id,
  v.phase,
  (
    select
      json_agg(t)
    from
      (
        SELECT
          v,
          count(v)
        FROM
          unnest(genotype) AS v
        group by
          v
      ) as t
  ) as allele_counts,
  a.func,
  a.genes,
  a.exonic_func,
  a.aa_change,
  a.af_afr,
  a.af_sas,
  a.af_amr,
  a.af_eas,
  a.af_nfe,
  a.af_fin,
  a.af_asj,
  a.af_oth,
  a.cln_allele_id,
  a.cln_cond,
  a.cln_dis_db,
  a.cln_rev_stat,
  a.cln_sig,
  a.cadd_phred,
  a.polyphen_max,
  a.revel_max,
  a.sift_max
FROM
  variant v
  left join annotation a on v."chr" = a."chr"
  and v."position" = a."position"
  and v."ref" = a."ref"
  and v.alt = a.alt;


-- DropForeignKey
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_source_id_fkey";

-- AlterTable
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_pkey",
DROP COLUMN "source_id",
ADD CONSTRAINT "annotation_pkey" PRIMARY KEY ("chr", "position", "ref", "alt");


