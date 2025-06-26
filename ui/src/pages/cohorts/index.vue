<template>
  <div class="mt-1">
    <div>
      <div>
        <h2 class="text-3xl font-bold text-center mb-4">
          Welcome to Cohort Builder!
        </h2>
        <p class="text-lg text-center mb-4 md:mb-6">
          Streamline your cohort creation process with ease.
        </p>
      </div>
      <div class="flex justify-center gap-5">
        <!-- new phenotype cohort button -->
        <va-button
          @click="addNewPTCohort"
          preset="primary"
          icon="add"
          class="flex-none"
          color="primary"
          size="large"
          border-color="primary"
        >
          New Phenotype Cohort
        </va-button>

        <!-- new genotype cohort button -->
        <!-- <va-button
          @click="addNewGTCohort"
          preset="primary"
          icon="add"
          class="flex-none"
          color="primary"
          size="large"
          border-color="primary"
        >
          New Genotype Cohort
        </va-button> -->
      </div>
    </div>
    <VaCard class="mt-5">
      <VaCardContent>
        <CohortSearch @select="addCohort" show-actions />
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup>
import { DEFAULT_LOGICAL_OPERATOR } from "@/components/cohorts/combination/constants";
import { createCohort, PhenotypeCohort } from "@/components/cohorts/models";
import participantsService from "@/services/participants";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const router = useRouter();

const cohortsStore = useCohortsStore();

const { totalParticipants } = storeToRefs(cohortsStore);

function addCohort(cohort_data) {
  // add an existing cohort - dirty: false
  cohortsStore.appendCohort(
    createCohort(cohort_data),
    DEFAULT_LOGICAL_OPERATOR,
  );

  router.push("/cohorts/builder");
}
function addNewPTCohort() {
  // add an empty phenotype cohort - dirty: true
  cohortsStore.appendCohort(
    new PhenotypeCohort({
      size: totalParticipants.value,
    }),
    DEFAULT_LOGICAL_OPERATOR,
  );

  router.push("/cohorts/builder");
}

// function addNewGTCohort() {
//   // add an empty phenotype cohort - dirty: true
//   cohortsStore.appendCohort(
//     new GenotypeCohort({
//       size: totalParticipants.value,
//     }),
//     DEFAULT_LOGICAL_OPERATOR,
//   );

//   router.push("/cohorts/builder");
// }

onMounted(() => {
  participantsService.getTotalCount().then((res) => {
    totalParticipants.value = res.data.total;
  });
});
</script>

<route lang="yaml">
meta:
  title: Cohorts
  nav: [{ label: "Cohorts" }]
</route>
