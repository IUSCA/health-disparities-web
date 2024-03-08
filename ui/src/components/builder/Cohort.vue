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
            @save="
              (savedCohort) =>
                (cohort = cohortsStore.transformStoredCohort(savedCohort))
            "
            @export="exportCohort(cohort, idx)"
            @remove="() => cohortsStore.deleteCohort(props.idx)"
          />
        </div>
      </div>

      <va-divider class="md:hidden" />

      <div class="md:w-9/12">
        <CohortQueryBuilder
          v-model:query="cohort.query"
          v-if="cohort.is_supported"
          :disabled="cohort.is_locked"
        />
        <div v-else class="flex h-full items-center justify-center">
          <i-mdi-alert-circle-outline class="" />
          <span class="ml-2 va-text-secondary">
            This cohort is not editable by the Phenotype query builder.
          </span>
        </div>
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import cohortService from "@/services/cohort2";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
import {
  isAPIQueryEmpty,
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
    if (cohort.value?.is_supported)
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
    if (!cohort.value?.is_supported) return;
    if (isAPIQueryEmpty(newQuery)) {
      cohort.value.size = totalParticipants.value;
      return;
    }
    if (JSON.stringify(oldQuery) !== JSON.stringify(newQuery)) {
      console.log("Cohort query changed", newQuery, oldQuery);
      loading.value = true;
      cohortService
        .searchParticipants(newQuery)
        .then((response) => {
          cohort.value.size = response.data.count;
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
