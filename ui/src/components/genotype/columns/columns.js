const COLUMNS = {
  chr: {
    label: "Variant ID",
    thTitle: "chromosome-position-ref-alt",
    _show: true,
    tdClass: "va-text-primary",
    width: "160px",
    tdStyle: "white-space: pre-wrap; word-wrap: break-word;",
  },
  allele_number: {
    label: "AN",
    category: "Allele Stats",
    thTitle: "Allele Number",
    _show: true,
    numeric: true,
    type: "number",
  },
  allele_count: {
    label: "AC",
    category: "Allele Stats",
    thTitle: "Alternate Allele Count",
    _show: true,
    numeric: true,
    type: "number",
  },
  allele_freq: {
    label: "AF",
    category: "Allele Stats",
    thTitle: "Alternate Allele Frequency",
    _show: true,
    numeric: true,
    type: "number",
  },
  c0: {
    // c0 is used to represent 0/0 and 0|0
    label: "Hom. Ref.",
    category: "Allele Stats",
    thTitle: "Homozygous Reference (0/0 or 0|0)",
    _show: true,
    numeric: true,
    type: "number",
  },
  c1: {
    // c1 is used to represent 0/1 and 0|1
    label: "Het.",
    category: "Allele Stats",
    thTitle: "Heterozygous (0/1 or 0|1)",
    _show: true,
    numeric: true,
    type: "number",
  },
  c2: {
    // corresponds to c2, defined only when phase is true
    label: "Het. Flipped",
    category: "Allele Stats",
    thTitle: "Flipped Heterozygous (1|0)",
    _show: true,
    numeric: true,
    type: "number",
  },
  c3: {
    // c3 is used to represent 1/1 or 1|1
    label: "Hom. Alt.",
    category: "Allele Stats",
    thTitle: "Homozygous Alternate (1/1 or 1|1)",
    _show: true,
    numeric: true,
    type: "number",
  },
  missing: {
    label: "Missing",
    category: "Allele Stats",
    thTitle: "./. Missing Genotypes",
    _show: true,
    numeric: true,
    type: "number",
  },
  func: {
    label: "Func.",
    category: "Genes",
    thTitle: "Function",
    _show: false,
    type: "select",
  },
  genes: {
    label: "Genes",
    category: "Genes",
    thTitle: "Genes",
    _show: false,
    type: "select",
  },
  exonic_func: {
    label: "Exonic Func.",
    category: "Genes",
    thTitle: "Exonic Function",
    _show: false,
    type: "select",
  },
  aa_change: {
    label: "Protien Change",
    category: "Genes",
    thTitle: "Amino Acid Change",
    _show: false,
    type: "select",
  },
  cadd_phred: {
    label: "CADD",
    category: "GnomAD",
    thTitle:
      "Cadd Phred-like scores ('scaled C-scores') ranging from 1 to 99, based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values are more deleterious.",
    _show: true,
    numeric: true,
    type: "number",
  },
  polyphen_max: {
    label: "Polyphen",
    category: "GnomAD",
    thTitle:
      "Score that predicts the possible impact of an amino acid substitution on the structure and function of a human protein, ranging from 0.0 (tolerated) to 1.0 (deleterious).  We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.",
    _show: true,
    numeric: true,
    type: "number",
  },
  revel_max: {
    label: "Revel",
    category: "GnomAD",
    thTitle:
      "The maximum REVEL score at a site's MANE Select or canonical transcript. It's an ensemble score for predicting the pathogenicity of missense variants (based on 13 other variant predictors). Scores ranges from 0 to 1. Variants with higher scores are predicted to be more likely to be deleterious.",
    _show: true,
    numeric: true,
    type: "number",
  },
  sift_max: {
    label: "SIFT",
    category: "GnomAD",
    thTitle:
      "Score reflecting the scaled probability of the amino acid substitution being tolerated, ranging from 0 to 1. Scores below 0.05 are predicted to impact protein function. We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.",
    _show: true,
    numeric: true,
    type: "number",
  },
  af_afr: {
    label: "AF AFR",
    category: "AF",
    thTitle:
      "Alternate allele frequency in samples of African/African-American ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  af_amr: {
    label: "AF AMR",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of Latino ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  af_eas: {
    label: "AF EAS",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of East Asian ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  af_fin: {
    label: "AF FIN",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of Finnish ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  af_nfe: {
    label: "AF NFE",
    category: "AF",
    thTitle:
      "Alternate allele frequency in samples of Non-Finnish European ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  af_sas: {
    label: "AF SAS",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of South Asian ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  af_oth: {
    label: "AF OTH",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of other ancestry",
    _show: false,
    numeric: true,
    type: "number",
  },
  cln_allele_id: {
    label: "CLN Allele ID",
    category: "ClinVAR",
    thTitle: "ClinVar Allele ID",
    _show: false,
    type: "text",
  },
  cln_dis_db: {
    label: "CLN Dis. DB",
    category: "ClinVAR",
    thTitle:
      "Tag-value pairs of disease database name and identifier submitted for germline classifications, e.g. OMIM:NNNNNN",
    _show: false,
    type: "select",
  },
  cln_dn: {
    label: "CLN DN",
    category: "ClinVAR",
    thTitle:
      "ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB",
    _show: false,
    type: "select",
  },
  cln_hgvs: {
    label: "CLN HGVS",
    category: "ClinVAR",
    thTitle: "Top-level (primary assembly, alt, or patch) HGVS expression.",
    _show: false,
    type: "select",
  },
  cln_rev_stat: {
    label: "CLN Rev. Stat.",
    category: "ClinVAR",
    thTitle:
      "ClinVar review status of germline classification for the Variation ID",
    _show: false,
    type: "select",
  },
  cln_sig: {
    label: "CLN Sig.",
    category: "ClinVAR",
    thTitle:
      "Aggregate germline classification for this single variant; multiple values are separated by a vertical bar",
    _show: false,
    type: "select",
  },
  cln_vc: {
    label: "CLN VC",
    category: "ClinVAR",
    thTitle: "Variant type",
    _show: false,
    type: "select",
  },
  cln_vcso: {
    label: "CLN VCSO",
    category: "ClinVAR",
    thTitle: "Sequence Ontology id for variant type",
    _show: false,
    type: "select",
  },
  cln_geneinfo: {
    label: "CLN Gene Info",
    category: "ClinVAR",
    thTitle:
      "Gene(s) for the variant reported as gene symbol:gene id. The gene symbol and id are delimited by a colon (:) and each pair is delimited by a vertical bar (|)",
    _show: false,
    type: "select",
  },
  cln_mc: {
    label: "CLN MC",
    category: "ClinVAR",
    thTitle:
      "comma separated list of molecular consequence in the form of Sequence Ontology ID|molecular_consequence",
    _show: false,
    type: "select",
  },
};

// thTile is used to set the column header tooltip

// add thStyle: "cursor: help;", to each column
Object.values(COLUMNS).forEach((col) => {
  col.thStyle = "cursor: help;";
});

function getDefaultColumns() {
  // return an object with the same keys as columns with the value of _show (boolean)
  return Object.entries(COLUMNS).reduce((acc, [key, col]) => {
    acc[key] = col._show;
    return acc;
  }, {});
}

export { COLUMNS, getDefaultColumns };
