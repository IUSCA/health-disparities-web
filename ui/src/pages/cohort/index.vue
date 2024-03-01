<template>
  <!-- Cohort Selector -->
  <div class="mb-5">
    <CohortSelector />
  </div>

  <!-- Query Builder -->
  <div class="flex flex-col gap-3">
    <VaCard
      class="cohort-card"
      v-for="(cohort, idx) in cohorts"
      :key="cohort.id"
    >
      <VaCardContent>
        <Cohort
          :idx="idx"
          :cohort="cohort"
          @update:cohort="(updatedCohort) => (cohorts[idx] = updatedCohort)"
        />
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
