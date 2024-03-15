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
    </div>
    <div class="mt-3">
      <CohortActions
        :cohort="combinationCohort"
        @export="exportCohort(cohort, idx)"
        hide-remove
      />
    </div>
  </div>
</template>

<script setup>
// import config from "@/config";
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();

// const props = defineProps({});

const { combinationCohort } = storeToRefs(cohortsStore);
</script>
