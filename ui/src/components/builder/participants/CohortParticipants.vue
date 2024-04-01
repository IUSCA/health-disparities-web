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
    <div v-if="mode === 'data'">
      <ParticipantsData :participants="participants" />
      <Pagination
        class="mt-4 px-1 lg:px-3"
        v-model:page="currPage"
        v-model:page_size="pageSize"
        :total_results="selectedCohort.size"
        :curr_items="participants.length"
        :page_size_options="PAGE_SIZE_OPTIONS"
      />
    </div>
    <!-- visualization -->
    <div v-if="mode === 'visualization'">
      <ParticipantsVisualization :participants="participants" />
    </div>
  </div>
</template>

<script setup>
import cohortService from "@/services/cohort2";
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

// select component options are instances of Cohort class but it converts to plain object when assigning to v-model
// so we track the id of the selected cohort and use it to find the cohort object
const selectValue = ref(null);
const selectedCohort = ref(null);
const mode = ref("data");
const participants = ref([]);
const currPage = ref(1);
const pageSize = ref(10);
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const offset = computed(() => (currPage.value - 1) * pageSize.value);

const selectableCohorts = computed(() => {
  return (isInCombineMode.value ? [combinationCohort.value] : []).concat(
    cohorts.value.filter((c) => !c.isEmpty()),
  );
});

watch(selectValue, (val) => {
  console.log("value changed", val);
  selectedCohort.value = selectableCohorts.value.find((c) => c.id === val);
});

// automatically choose a default selected cohort
// when entering combine mode, choose the combination cohort
// when exiting combine mode, choose the first non-empty cohort
watch(
  isInCombineMode,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      selectValue.value = combinationCohort.value.id;
      return;
    }
    if (!newVal && oldVal) {
      selectValue.value = cohorts.value.find((c) => !c.isEmpty())?.id;
    }
  },
  {
    immediate: true,
  },
);

// update the selectedCohort when cohorts or combinationCohort changes
watch(
  [cohorts, combinationCohort],
  () => {
    // if there is no selected cohort, choose the first non-empty cohort
    // when not in combine mode. The above watch handles the case when
    // entering and exiting the combine mode
    if (selectValue.value == null) {
      if (!isInCombineMode.value) {
        const c = cohorts.value.find((c) => !c.isEmpty());
        if (c) selectValue.value = c.id;
      }
      return;
    }
    // if the selected cohort is still in the list of cohorts or combinationCohort
    // update it
    // else set it to null
    if (combinationCohort.value.id === selectedCohort.value.id) {
      selectedCohort.value = combinationCohort.value;
      return;
    }
    const c = cohorts.value.find((c) => c.id === selectedCohort.value.id);
    if (c) {
      selectedCohort.value = c;
      return;
    }
    selectValue.value = null;
  },
  {
    deep: true,
    immediate: true,
  },
);

async function fetchParticipants() {
  if (!selectedCohort.value) return;
  const cohort_id = selectedCohort.value.is_dirty
    ? selectedCohort.value.search_id
    : selectedCohort.value.id;
  console.log("fetchParticipants cohort id", cohort_id);

  if (cohort_id && !selectedCohort.value.isEmpty()) {
    return cohortService
      .getParticipants({
        id: cohort_id,
        limit: pageSize.value,
        offset: offset.value,
      })
      .then((response) => {
        participants.value = response.data;
      });
  }
}

watch(
  selectedCohort,
  () => {
    fetchParticipants().then(() => {
      currPage.value = 1;
    });
  },
  {
    immediate: true,
    deep: true,
  },
);

watch([currPage, pageSize], fetchParticipants);
</script>
