import { COLUMNS } from "@/components/genotype/columns/columns";

function columnsByType(type) {
  return Object.entries(COLUMNS)
    .filter(([_, col]) => col.category === type)
    .map(([key, col]) => ({
      key,
      type: col.type,
      label: col.alt_label || col.label,
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
    label: "1000 Genomes Project",
    key: "1000 Genomes Project",
    icon: "mdi-chart-bell-curve",
    filters: columnsByType("1000 Genomes Project"),
  },
  {
    label: "GnomAD",
    key: "GnomAD",
    icon: "mdi-chart-timeline-variant",
    filters: columnsByType("GnomAD"),
  },
];
