const PAGE_SIZE_OPTIONS = [25, 50, 100];
const NUMERIC_PRECISION = 3;
const EXAMPLE_SEARCHES = {
  gene: "GAB4",
  variant: "22-17477492-C-A", //"22-17311348-C-A"
  genomic_region: "chr22:17455700-17575000",
};
const DEFAULT_ZYGOSITIES = ["HET", "HOMALT"];
// cspell: ignore MYBPC3 ACTC LMNA TNNI TNNT
const EXAMPLE_GENES_LIST = [
  "MYH7",
  "MYBPC3",
  "TNNT2",
  "TNNI3",
  "TPM1",
  "ACTC1",
  "MYL2",
  "TTN",
  "LMNA",
  "SCN5A",
];

export {
  DEFAULT_ZYGOSITIES,
  EXAMPLE_GENES_LIST,
  EXAMPLE_SEARCHES,
  NUMERIC_PRECISION,
  PAGE_SIZE_OPTIONS
};

export const injectionKeys = {
  snapshotId: Symbol("snapshotId"),
  sourceId: Symbol("sourceId"),
  ranges: Symbol("ranges"),
};
