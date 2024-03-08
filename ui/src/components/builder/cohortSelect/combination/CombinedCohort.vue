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
            <NumberTransition :target="num_participants" :debounce="50" />
          </span>
          <span> participants </span>
        </div>
        <div class="text-sm va-text-secondary w-[128px]">Combined Cohort</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  isAPIQueryEmpty,
  transformQueryForApi,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
// import config from "@/config";
import cohortService from "@/services/cohort2";
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();

// const props = defineProps({});

const { cohorts, operators } = storeToRefs(cohortsStore);

const num_participants = ref(0);
// if either cohorts or operators change, search for participants

const anyUnsavedCohorts = computed(() => {
  return cohorts.value.some((cohort) => cohortsStore.isNewCohort(cohort));
});

const queries = computed(() => {
  return cohorts.value.map((cohort) => {
    if (cohort.is_supported) {
      return transformQueryForApi(cohort.query);
    }
    return null;
  });
});

const anyEmptyCohorts = computed(() => {
  return queries.value.some((query) => {
    return query !== null && isAPIQueryEmpty(query);
  });
});

// if there are no cohorts with empty queries
// and there are at least 2 cohorts
watchDebounced(
  [queries, operators],
  async () => {
    if (cohorts.value.length >= 2 && !anyEmptyCohorts.value) {
      console.log(
        "searching for participants - combined",
        anyUnsavedCohorts.value,
      );
      // make sure all cohorts are saved before searching
      // await saveCohorts();

      // combine and search for participants
      const cohort_ids = cohorts.value.map((cohort) => cohort.id);
      cohortService
        .searchParticipantsWithSetOperations(cohort_ids, operators.value)
        .then((response) => {
          num_participants.value = response.data.count;
          console.log(response);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  },
  {
    deep: true,
    debounce: 300,
  },
);

// function saveCohorts() {
//   // save all new cohorts and update store with response cohort which has id
//   const savePromises = cohorts.value.map((cohort, idx) => {
//     if (!cohortsStore.isNewCohort(cohort)) {
//       return Promise.resolve();
//     }
//     console.log("saving cohort", cohort.name);
//     const cohort_data = {
//       name: cohort.name,
//       query: {
//         ...config.cohort.phenotype_schema,
//         query: transformQueryForApi(cohort.query),
//       },
//     };
//     return cohortService.create(cohort_data).then((res) => {
//       cohorts.value[idx].id = res.data.id;
//     });
//   });
//   return Promise.all(savePromises);
// }
</script>
