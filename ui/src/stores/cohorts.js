import { defaultQuery } from "@/components/builder/cohortQueryBuilder";
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

  function updateOperator(idx2, op) {
    // idx2 is the index of the second operand / cohort
    // set the operator given the index of the second operand
    if (idx2 < 1 || idx2 >= cohorts.value.length) {
      console.error("Invalid index", idx2);
      return;
    }
    const idx1 = idx2 - 1;
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
      name: makeNewName(),
      participants: totalParticipants.value,
      query: defaultQuery(),
    };
  }

  return {
    cohorts,
    operators,
    totalParticipants,
    appendCohort,
    deleteCohort,
    updateOperator,
    makeEmptyCohort,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useCohortsStore, import.meta.hot));
