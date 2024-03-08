export const combinations = {
  union: {
    key: "union",
    label: "Union",
    icon: "mdi-vector-union",
    html: "&cup;",
    description: "All participants from both cohorts",
  },
  intersection: {
    key: "intersection",
    label: "Intersection",
    icon: "mdi-vector-intersection",
    html: "&cap;",
    description: "Only the participants that are in both cohorts",
  },
  difference: {
    key: "difference",
    label: "Difference",
    icon: "mdi-vector-difference-ba",
    html: "&minus;",
    description:
      "All participants from the first cohort that are not in the second cohort",
  },
  symmetric_difference: {
    key: "symmetric_difference",
    label: "Unique (Symmetric Difference)",
    icon: "mdi-vector-difference",
    html: "&#8854;",
    description:
      "All participants that are in one cohort or the other, but not both",
  },
};
export const DEFAULT_LOGICAL_OPERATOR = "union";
