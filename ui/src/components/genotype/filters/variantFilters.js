import { COLUMNS } from "@/components/genotype/columns/columns";

function columnsByType(type) {
  return Object.entries(COLUMNS)
    .filter(([_, col]) => col.category === type)
    .map(([key, col]) => ({
      key,
      type: col.type,
      label: col.label,
    }));
}

export const variantFilters = [
  {
    label: "Allele Stats",
    key: "allele_stats",
    icon: "mdi-chart-bar-stacked",
    filters: columnsByType("Allele Stats"),
  },
  {
    label: "ClinVar",
    key: "clinvar",
    icon: "mdi-database-search",
    filters: columnsByType("ClinVAR"),
  },
  {
    label: "Genes",
    key: "Genes",
    icon: "mdi-dna",
    filters: columnsByType("Genes"),
  },
  {
    label: "Allele Frequencies",
    key: "AF",
    icon: "mdi-chart-bell-curve",
    filters: columnsByType("AF"),
  },
  {
    label: "GnomAD",
    key: "GnomAD",
    icon: "mdi-chart-timeline-variant",
    filters: columnsByType("GnomAD"),
  },
];
