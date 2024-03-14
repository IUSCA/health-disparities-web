<template>
  <div v-if="cohorts.length > 0">
    <VaDropdown :offset="[0, 40]">
      <template #anchor>
        <va-button
          color="primary"
          icon="add"
          round
          class="ml-5"
          :disabled="cohorts.length >= 5"
        />
      </template>

      <VaDropdownContent>
        <div class="flex flex-col gap-1 py-1 items-start">
          <!-- new cohort button -->
          <va-button
            @click="addNewCohort"
            preset="secondary"
            icon="group_add"
            class="cohort-select-buttons w-full"
          >
            New Cohort
          </va-button>

          <!-- Search for cohort -->
          <!-- opens the CohortSearchModal -->
          <!-- which emits select event when user clicks on cohort from search resutls -->
          <!-- addCohort is the handler -->
          <va-button
            @click="cohortSearchModal.show"
            preset="secondary"
            icon="search"
            class="cohort-select-buttons w-full"
          >
            Search Cohorts
          </va-button>
        </div>
      </VaDropdownContent>
    </VaDropdown>
  </div>
  <div v-else>
    <div class="flex flex-wrap gap-3 md:gap-5 items-center justify-center">
      <!-- new cohort button -->
      <va-button @click="addNewCohort" icon="add" class="" size="large">
        New Cohort
      </va-button>

      <!-- Search for cohort -->
      <!-- opens the CohortSearchModal -->
      <!-- which emits select event when user clicks on cohort from search resutls -->
      <!-- addCohort is the handler -->
      <va-button
        preset="primary"
        icon="search"
        class=""
        size="large"
        border-color="primary"
        @click="() => cohortSearchModal.show()"
      >
        Search Cohorts
      </va-button>
    </div>
  </div>
  <CohortSearchModal ref="cohortSearchModal" @select="addCohort" />
</template>

<script setup>
import { DEFAULT_LOGICAL_OPERATOR } from "@/components/builder/cohortSelect/combination/constants";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const { cohorts } = storeToRefs(cohortsStore);

// const props = defineProps({});
const cohortSearchModal = ref(null);

function addNewCohort() {
  // add an empty cohort - dirty: true
  cohortsStore.appendCohort(
    cohortsStore.makeEmptyPhenotypeCohort(),
    DEFAULT_LOGICAL_OPERATOR,
  );
}

function addCohort(cohort) {
  // add an existing cohort - dirty: false
  cohortsStore.appendCohort(
    cohortsStore.transformStoredCohort(cohort),
    DEFAULT_LOGICAL_OPERATOR,
  );
}
</script>

<style scoped>
.cohort-select-buttons {
  --va-button-justify-content: left;
}
</style>@/components/builder/combination/constants
