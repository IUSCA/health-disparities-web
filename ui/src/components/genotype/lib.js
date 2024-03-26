function parseQuery(text) {
  /*
  Text can be in the following formats:

  Gene: BRCA2
  Variant: 13-32355250-T-C
  Genomic region: chr13:32355000-32375000

  If text starts with a number, assume it is a variant
  If text starts with 'chr', assume it is a genomic region
  Otherwise, assume it is a gene
  */

  const variantRegex = /^([\dXY]+)-(\d+)-([ATCG]+)-([ATCG]+)$/;
  const genomicRegionRegex = /^CHR([\dXY]+):(\d+)-(\d+)$/;
  const geneRegex = /^([a-zA-Z0-9]+)$/;

  text = text.trim().toUpperCase();
  if (variantRegex.test(text)) {
    const match = text.match(variantRegex);
    return {
      chr: match[1],
      start: match[2],
      ref: match[3],
      alt: match[4],
    };
  } else if (genomicRegionRegex.test(text)) {
    const match = text.match(genomicRegionRegex);
    return {
      chr: match[1],
      start: match[2],
      end: match[3],
    };
  } else if (geneRegex.test(text)) {
    return {
      gene: text,
    };
  } else {
    return {};
  }
}

export default {
  parseQuery,
};
