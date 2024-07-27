<template>
  <div class="flex gap-3 items-center justify-between">
    <VaButtonToggle
      v-model="mode"
      :options="options"
      color="background-element"
      border-color="background-border"
      toggleColor="primary"
    />

    <!-- select a cohort -->
    <VaSelect
      v-model="selectValue"
      :options="selectableCohorts"
      text-by="name"
      value-by="id"
      placeholder="Select a cohort"
      class="flex-none"
    />
  </div>
  <div class="mt-3" v-if="selectedCohort">
    <div v-if="selectedCohort?.size === 0">
      <CohortDataNoParticipants />
    </div>
    <div v-else>
      <div v-if="mode === 'data'">
        <ParticipantsData :cohort="selectedCohort" />
      </div>
      <!-- visualization -->
      <div v-if="mode === 'visualization'">
        <ParticipantsVisualization :cohort="selectedCohort" />
      </div>
    </div>
  </div>
  <div v-else>
    <CohortDataNoSelection :isVisualization="mode === 'visualization'" />
  </div>
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
// const props = defineProps({})

const cohortsStore = useCohortsStore();
const { cohorts, combinationCohort, isInCombineMode } =
  storeToRefs(cohortsStore);

const options = [
  {
    label: "Data",
    value: "data",
  },
  {
    label: "Visualization",
    value: "visualization",
  },
];

// If the options of VaSelect component are the instances of Cohort class then
// vue converts to plain object when assigning to v-model
// so we track the id of the selected cohort and use it to find the cohort object
const selectValue = ref(null);
const selectedCohort = ref(null);
const mode = ref("visualization");

// selectable cohorts (list) are non-empty cohorts and the combination cohort if in combine mode
const selectableCohorts = computed(() => {
  console.log("selectableCohorts computation done");
  return (isInCombineMode.value ? [combinationCohort.value] : []).concat(
    cohorts.value.filter((c) => !c.isEmpty()).map((c) => toRaw(c)),
  );
});

// watch the selectValue and update the selectedCohort
watch(selectValue, (val) => {
  console.log("watch selectValue", val);
  selectedCohort.value = selectableCohorts.value.find((c) => c.id === val);
});

// automatically choose a default selected cohort
// when entering combine mode, choose the combination cohort
// when exiting combine mode, choose the first non-empty cohort
watch(
  isInCombineMode,
  (newVal, oldVal) => {
    console.log("watch isInCombineMode", newVal, oldVal);
    if (newVal && !oldVal) {
      // entering combine mode
      selectValue.value = combinationCohort.value.id;
      return;
    }
    if (!newVal && oldVal) {
      // exiting combine mode
      selectValue.value = cohorts.value.find((c) => !c.isEmpty())?.id;
    }
  },
  {
    immediate: true,
  },
);

// update the selectedCohort when cohorts or combinationCohort changes
// watch(
//   [cohorts, combinationCohort],
//   () => {
//     // if there is no selected cohort, choose the first non-empty cohort
//     // when not in combine mode. The above watch handles the case when
//     // entering and exiting the combine mode
//     if (selectValue.value == null) {
//       if (!isInCombineMode.value) {
//         const c = cohorts.value.find((c) => !c.isEmpty());
//         if (c) selectValue.value = c.id;
//       }
//       return;
//     }
//     // if the selected cohort is still in the list of cohorts or combinationCohort
//     // update it
//     // else set it to null
//     if (combinationCohort.value.id === selectedCohort.value.id) {
//       selectedCohort.value = combinationCohort.value;
//       console.log("setting selectedCohort", selectedCohort.value);
//       return;
//     }
//     const c = cohorts.value.find((c) => c.id === selectedCohort.value.id);
//     if (c) {
//       selectedCohort.value = c;
//       console.log("setting selectedCohort", selectedCohort.value);
//       return;
//     }
//     selectValue.value = null;
//   },
//   {
//     deep: true,
//     immediate: true,
//   },
// );
</script>
