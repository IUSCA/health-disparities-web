-- AlterTable
ALTER TABLE "annotation" ADD COLUMN     "cadd_phred" DOUBLE PRECISION,
ADD COLUMN     "polyphen_max" DOUBLE PRECISION,
ADD COLUMN     "revel_max" DOUBLE PRECISION,
ADD COLUMN     "sift_max" DOUBLE PRECISION;

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
  and v.alt = a.alt
  and v.source_id = a.source_id;