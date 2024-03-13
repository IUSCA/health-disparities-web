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
        <CohortQueryBuilder
          v-model:query="cohort.query"
          v-if="cohort.is_supported"
          :locked="cohort.is_locked"
        />
        <div v-else class="flex h-full items-center justify-center">
          <i-mdi-alert-circle-outline class="" />
          <span class="ml-2 va-text-secondary">
            Genomic variant cohort created with Variant Xplorer. (not editable)
          </span>
        </div>
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import cohortService from "@/services/cohort2";
import toast from "@/services/toast";
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

const emit = defineEmits(["beforeSearch", "afterSearch"]);

const cohortsStore = useCohortsStore();
const { totalParticipants, cohorts } = storeToRefs(cohortsStore);

const canon_query = ref(transformQueryForApi(cohort.value.query));
const loading = ref(false);

function search(query) {
  emit("beforeSearch");
  loading.value = true;
  cohortService
    .searchParticipants({
      query,
      search_id: cohort.value.search_id,
      save_results: cohorts.value.length > 1,
    })
    .then((res) => {
      cohort.value.size = res.data.count;
      cohort.value.search_id = res.data.search_id;
      emit("afterSearch");
    })
    .catch((error) => {
      emit("afterSearch", error);
      console.error("Error fetching cohort size", error);
      toast.error("Error fetching cohort size");
    })
    .finally(() => {
      loading.value = false;
    });
}

// for every change in the query, transform it to the API query format (canonical query)
watchDebounced(
  () => cohort.value.query,
  (newQuery) => {
    if (cohort.value?.is_supported)
      canon_query.value = transformQueryForApi(newQuery);
  },
  {
    debounce: 300,
    deep: true,
  },
);

// watch for changes in the canonical query
// do not run on unsupported cohorts
// if the canonical query is empty, set the cohort size to the total participants
// deep compate old and new canonical queries to avoid unnecessary API calls
// if the query has changed, call the API to get the count of participants
// set cohort as dirty
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

      cohort.value.is_dirty = true;
      search(newQuery);
    }
  },
  { deep: true },
);

// when number of cohorts goes from 1 to 2, search and save results so that combine can be done
// needed only if cohort is dirty but query is not empty
watch(
  () => cohorts.value.length,
  (newVal, oldVal) => {
    if (
      newVal === 2 &&
      oldVal === 1 &&
      cohort.value.is_dirty &&
      !isAPIQueryEmpty(canon_query.value)
    ) {
      search(canon_query.value);
    }
  },
);

function exportCohort() {
  console.log("Export cohort", cohort.value, props.idx);
}
</script>
