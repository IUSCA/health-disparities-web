const { getFieldsWithType } = require('../../db');

const dbSchema = getFieldsWithType('gt_stats_annotations');

// TODO: genes
const ANNOTATION_FIELDS = ['func', 'exonic_func', 'aa_change', 'cln_cond', 'cln_allele_id', 'cln_dis_db', 'cln_dn', 'cln_hgvs', 'cln_rev_stat', 'cln_sig', 'cln_vc', 'cln_vcso', 'cln_geneinfo', 'cln_mc'];

const ANNOTATION_NUMERIC_FIELDS = ['af_afr', 'af_sas', 'af_amr', 'af_eas', 'af_nfe', 'af_fin', 'af_asj', 'af_oth', 'cadd_phred', 'revel_max', 'polyphen_max', 'sift_max'];
const GENOTYPE_STATISTICS_FIELDS = ['missing', 'c0', 'c1', 'c2', 'c3', 'allele_number', 'allele_count', 'allele_freq'];
const NUMERIC_FIELDS = [...ANNOTATION_NUMERIC_FIELDS, ...GENOTYPE_STATISTICS_FIELDS];

module.exports = {
  dbSchema,
  ANNOTATION_FIELDS,
  ANNOTATION_NUMERIC_FIELDS,
  GENOTYPE_STATISTICS_FIELDS,
  NUMERIC_FIELDS,
};
