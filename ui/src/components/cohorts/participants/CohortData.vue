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
      noOptionsText="No valid cohorts available"
      style="
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      "
    />
  </div>
  <div class="mt-3" v-if="selectValue">
    <div v-if="selectedCohort?.size === 0">
      <CohortDataNoParticipants />
    </div>
    <div v-else>
      <div v-if="mode === 'data'">
        <ParticipantsData
          :cohort-id="selectValue"
          :lastUpdated="props.lastUpdated"
        />
      </div>
      <!-- visualization -->
      <div v-if="mode === 'visualization'">
        <ParticipantsVisualization
          :cohort-id="selectValue"
          :lastUpdated="props.lastUpdated"
        />
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

// lastUpdated is a timestamp and is a proxy for change events that parent can emit and pass down
// whenever a cohort is searched, lastUpdated is updated to current time so that child components can re-fetch data
const props = defineProps({
  lastUpdated: {
    type: Number,
  },
});

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

const mode = ref("visualization");
const selectValue = ref(null);

// used to show options for the select dropdown
const selectableCohorts = computed(() => {
  const nonEmptyCohort = cohorts.value.filter(
    (c) => !c.isEmpty() && c.getLatestId() != null,
  );

  const _selectableCohorts = (
    isInCombineMode.value ? [combinationCohort.value] : []
  ).concat(nonEmptyCohort);

  return _selectableCohorts.map((c) => {
    return {
      id: c.getLatestId(),
      name: c.name,
    };
  });
});

// used to show no results message
const selectedCohort = computed(() => {
  return cohorts.value
    .concat(combinationCohort.value)
    .filter((c) => c.getLatestId())
    .find((c) => c.getLatestId() === selectValue.value);
});

watch(
  selectableCohorts,
  (newVal, oldVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
      if (newVal.length > 0) {
        selectValue.value = newVal[0]?.id;
      } else {
        selectValue.value = null;
      }
    }
  },
  { immediate: true },
);
</script>
