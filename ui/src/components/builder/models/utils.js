import { Cohort, CombinationCohort } from "@/components/builder/models";
import { PhenotypeCohort } from "@/components/builder/models/phenotype";
import config from "@/config";

function isPhenotypeQuery({ name, namespace, version }) {
  return (
    name === config.cohort.schema.phenotype.name &&
    namespace === config.cohort.schema.phenotype.namespace &&
    version === config.cohort.schema.phenotype.version
  );
}

function isCombinationQuery({ name, namespace, version }) {
  return (
    name === config.cohort.schema.combination.name &&
    namespace === config.cohort.schema.combination.namespace &&
    version === config.cohort.schema.combination.version
  );
}

function createCohort(json) {
  if (isPhenotypeQuery(json.query)) {
    return PhenotypeCohort.fromJson(json);
  } else if (isCombinationQuery(json.query)) {
    return CombinationCohort.fromJson(json);
  } else {
    return new Cohort(json);
  }
}

export { createCohort, isCombinationQuery, isPhenotypeQuery };
