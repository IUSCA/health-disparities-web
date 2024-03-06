<template>
  <VaDropdown :offset="[0, 40]">
    <template #anchor>
      <va-button
        color="primary"
        icon="add"
        round
        class="ml-5"
        :disabled="cohorts.length >= 5"
        v-if="cohorts.length > 0"
      />
      <va-button
        color="primary"
        icon="add"
        round
        class="ml-5"
        size="large"
        v-else
      >
        Add Cohort
      </va-button>
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
  <CohortSearchModal ref="cohortSearchModal" @select="addCohort" />
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
import { DEFAULT_LOGICAL_OPERATOR } from "./combineCohorts";

const cohortsStore = useCohortsStore();
const { cohorts } = storeToRefs(cohortsStore);

// const props = defineProps({});
const cohortSearchModal = ref(null);

function addNewCohort() {
  // add an empty cohort
  cohortsStore.appendCohort(
    cohortsStore.makeEmptyCohort(),
    DEFAULT_LOGICAL_OPERATOR,
  );
}

function addCohort(cohort) {
  // add an existing cohort
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
</style>
