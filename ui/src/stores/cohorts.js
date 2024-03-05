import {
  defaultQuery,
  transformStoredQuery,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import config from "@/config";
import _ from "lodash";
import { acceptHMRUpdate, defineStore } from "pinia";
import { ref } from "vue";

export const useCohortsStore = defineStore("cohorts", () => {
  const cohorts = ref([]);

  // sequence of set operations to be applied interleaved with cohorts
  const operators = ref([]);

  const totalParticipants = ref(0);

  function appendCohort(cohort, op = null) {
    // op is the operator to be applied to the last cohort and this new cohort
    // if there are no cohorts, then op is not needed
    cohorts.value.push(cohort);
    if (op !== null && cohorts.value.length > 1) operators.value.push(op);
  }

  function deleteCohort(cohort_idx) {
    // remove the cohort and the operator before it
    // if the cohort is the first one, remove the operator after it
    if (cohort_idx < 0) {
      console.error("Invalid cohort", cohort_idx);
      return;
    }
    cohorts.value.splice(cohort_idx, 1);
    // if cohort_idx is 0, then 0, otherwise cohort_idx - 1
    const idx = cohort_idx > 0 ? cohort_idx - 1 : cohort_idx;

    // remove one element at idx position
    operators.value.splice(idx, 1);
  }

  function updateCohort(idx, cohort) {
    // idx is the index of the cohort to be updated
    if (idx < 0 || idx >= cohorts.value.length) {
      console.error("Invalid index", idx);
      return;
    }
    cohorts.value[idx] = cohort;
  }

  function updateOperator(idx1, op) {
    // idx1 is the index of the first operand / cohort
    // set the operator given the index of the first operand
    if (idx1 < 0 || idx1 >= cohorts.value.length - 1) {
      console.error("Invalid index", idx1);
      return;
    }
    operators.value[idx1] = op;
  }

  function makeNewName(baseName = "Untitled") {
    let name = baseName;
    let i = 1;
    while (cohorts.value.some((c) => c.name === name)) {
      name = `${baseName} ${i}`;
      i++;
    }
    return name;
  }

  function makeEmptyCohort() {
    return {
      id: _.uniqueId("cohort_"),
      name: makeNewName(),
      is_published: false,
      is_locked: false,
      is_protected: false,
      size: totalParticipants.value,
      query: defaultQuery(),
      set_operations: null,
      query_schema: config.cohort.phenotype_schema,
      is_supported: true,
    };
  }

  function isPhenotypeQuery({ name, namespace, version }) {
    return (
      name === config.cohort.phenotype_schema.name &&
      namespace === config.cohort.phenotype_schema.namespace &&
      version === config.cohort.phenotype_schema.version
    );
  }

  function transformStoredCohort(cohort) {
    console.log("transformStoredCohort", cohort);
    const { query: queryContainer, size, ...rest } = cohort;
    const { name, namespace, version, query, set_operations } = queryContainer;
    const sanitizedCohort = {
      ...rest,
      set_operations,
      query_schema: { name, namespace, version },
    };

    if (isPhenotypeQuery({ name, namespace, version })) {
      sanitizedCohort.is_supported = true;
      if (_.isEmpty(query)) {
        sanitizedCohort.query = defaultQuery();
        sanitizedCohort.size = totalParticipants.value;
      } else {
        sanitizedCohort.query = transformStoredQuery(query);
        sanitizedCohort.size = size;
      }
    } else {
      // unsupported query type
      sanitizedCohort.is_supported = false;
      sanitizedCohort.query = query;
      sanitizedCohort.size = size;
    }
    return sanitizedCohort;
  }

  function isNewCohort(c) {
    // no id (null or undefined)
    // if string and starts with "cohort_" then it's a new cohort
    return !c.id || (typeof c.id === "string" && c.id.startsWith("cohort_"));
  }

  return {
    cohorts,
    operators,
    totalParticipants,
    appendCohort,
    deleteCohort,
    updateCohort,
    updateOperator,
    makeEmptyCohort,
    transformStoredCohort,
    isNewCohort,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useCohortsStore, import.meta.hot));
