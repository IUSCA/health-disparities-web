<template>
  <VaInnerLoading :loading="loading">
    <div class="flex flex-col md:flex-row gap-3">
      <div
        class="md:w-3/12 md:border-r md:border-solid md:border-gray-500 md:pr-3"
      >
        <CohortInfo :cohort="cohort" :total-count="totalParticipants" />
        <div class="mt-3">
          <CohortActions
            :cohort="cohort"
            @save="(savedCohort) => (cohort = savedCohort)"
            @export="exportCohort(cohort, idx)"
            @remove="() => cohortsStore.deleteCohort(props.idx)"
          />
        </div>
      </div>

      <va-divider class="md:hidden" />

      <div class="md:w-9/12">
        <CohortQueryBuilder v-model:query="cohort.query" />
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import cohortService from "@/services/cohort2";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
import {
isQueryEmpty,
transformQueryForApi,
} from "./queryBuilder/cohortQueryBuilder";

const cohort = defineModel("cohort");
const props = defineProps({
  idx: Number,
});

const cohortsStore = useCohortsStore();
const { totalParticipants } = storeToRefs(cohortsStore);

const canon_query = ref(null);
const loading = ref(false);

watchDebounced(
  () => cohort.value.query,
  (newQuery) => {
    canon_query.value = transformQueryForApi(newQuery);
  },
  {
    debounce: 200,
    deep: true,
    immediate: true,
  },
);

watch(
  canon_query,
  (newQuery, oldQuery) => {
    if (isQueryEmpty(newQuery)) {
      cohort.value.participants = totalParticipants.value;
      return;
    }
    if (JSON.stringify(oldQuery) !== JSON.stringify(newQuery)) {
      console.log("Cohort query changed", newQuery, oldQuery);
      loading.value = true;
      cohortService
        .searchParticipants(newQuery)
        .then((response) => {
          cohort.value.participants = response.data.count;
        })
        .finally(() => {
          loading.value = false;
        });
    }
  },
  { deep: true },
);

function exportCohort() {
  console.log("Export cohort", cohort.value, props.idx);
}
</script>
