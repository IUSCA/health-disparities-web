import { acceptHMRUpdate, defineStore } from "pinia";
import { ref } from "vue";

export const useCohortsStore = defineStore("cohorts", () => {
  // maintain "dirty" state for each cohort to track which cohorts are not yet saved
  // - new cohorts are inherently dirty: constructors and createEmpty methods on Cohort class
  // - when a cohort is saved, it gets clean: save method on Cohort class
  // - when a cohort is loaded, it is clean: fromJson method on Cohort class
  // - when query of a cohort is changed, it gets dirty: Cohort Component

  const cohorts = ref([]);

  // sequence of set operations to be applied interleaved with cohorts
  const operators = ref([]);

  const totalParticipants = ref(0);
  const combinedCount = ref(0);

  const cohortsWithEmptyQueries = computed(() => {
    return cohorts.value.filter((c) => c.isEmpty());
  });
  const isInCombineMode = computed(() => {
    return (
      cohorts.value.length > 1 && cohortsWithEmptyQueries.value.length === 0
    );
  });

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

  return {
    cohorts,
    operators,
    combinedCount,
    totalParticipants,
    cohortsWithEmptyQueries,
    isInCombineMode,
    appendCohort,
    deleteCohort,
    updateCohort,
    updateOperator,
    makeNewName,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useCohortsStore, import.meta.hot));
