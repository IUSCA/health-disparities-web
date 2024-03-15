<template>
  <div class="md:border-r border-solid border-gray-500 pr-3 mr-3">
    <div class="flex flex-nowrap items-start gap-2">
      <!-- icon -->
      <div>
        <i-mdi-vector-combine
          class="text-4xl"
          :style="{
            color: stringToRGB('combined-cohort'),
          }"
        />
      </div>
      <!-- details -->
      <div>
        <div class="leading-4">
          <span class="font-semibold">
            <NumberTransition :target="combinationCohort.size" :debounce="50" />
          </span>
          <span> participants </span>
        </div>
        <div class="text-sm va-text-secondary w-[128px]">Combined Cohort</div>
      </div>

      <!-- save -->
      <div class="ml-3 h-full mt-auto mb-auto">
        <va-button
          color="success"
          @click="saveModal.show()"
          icon="save"
          preset="primary"
          size="small"
          :disabled="isSaveDisabled"
          :border-color="isSaveDisabled ? null : 'success'"
          round
        >
          Save
        </va-button>
      </div>
    </div>
  </div>
  <CohortSaveModal ref="saveModal" :cohort="combinationCohort" />
</template>

<script setup>
// import config from "@/config";
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();

// const props = defineProps({});

const { cohorts, combinationCohort } = storeToRefs(cohortsStore);
const saveModal = ref(null);

// can only save when
// - cohort is not locked
// - cohort_ids > 1
// - all underlying cohorts are saved
const isSaveDisabled = computed(() => {
  return (
    combinationCohort.value.is_locked ||
    combinationCohort.value.criteria.cohort_ids.length < 2 ||
    cohorts.value.some((c) => c.is_dirty)
  );
});

// todo
// to lock or publish a combined cohort, all underlying cohorts must be locked or published

// todo: show reasons why save is disabled

// todo: better placement of save button
</script>
