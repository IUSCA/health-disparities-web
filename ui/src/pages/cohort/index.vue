<template>
  <!-- Cohort Selector -->
  <div class="mb-5">
    <CohortSelector />
  </div>

  <!-- Query Builder -->
  <div class="flex flex-col gap-3">
    <VaCard class="cohort-card" v-for="(cohort, idx) in cohorts" :key="idx">
      <VaCardContent>
        <div class="flex flex-col md:flex-row gap-3">
          <div
            class="md:w-3/12 md:border-r md:border-solid md:border-gray-500 md:pr-3"
          >
            <CohortInfo :cohort="cohort" :total-count="totalParticipants" />
            <div class="mt-3">
              <CohortActions
                :cohort="cohort"
                @save="(savedCohort) => onSave(idx, savedCohort)"
                @export="exportCohort(cohort, idx)"
                @remove="removeCohort(cohort, idx)"
              />
            </div>
          </div>

          <va-divider class="md:hidden" />

          <div class="md:w-9/12">
            <CohortQueryBuilder v-model:query="cohort.query" />
          </div>
        </div>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup>
import cohortService from "@/services/cohort2";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const { cohorts, totalParticipants } = storeToRefs(cohortsStore);
// const props = defineProps({});

function onSave(idx, savedCohort) {
  console.log("Saved cohort", savedCohort);
  cohorts.value[idx] = savedCohort;
}
function exportCohort(cohort, idx) {
  console.log("Export cohort", cohort, idx);
}
function removeCohort(cohort, idx) {
  console.log("Remove cohort");
  cohortsStore.deleteCohort(idx);
}

cohortService.getTotalParticipants().then((res) => {
  totalParticipants.value = res.data.total;
});
</script>

<route lang="yaml">
meta:
  title: Cohort Builder
  nav: [{ label: "Cohort Builder" }]
</route>

<style scoped lang="scss">
.cohort-card {
  --va-card-padding: 0.75rem;
}
</style>
