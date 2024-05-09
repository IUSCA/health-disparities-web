<template>
  <CohortQueryBuilder
    v-model:query="cohort.criteria"
    :locked="cohort.is_locked"
  />
</template>

<script setup>
import { Cohort } from "@/components/builder/models";
import {
isAPIQueryEmpty,
transformQueryForApi,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import config from "@/config";
import cohortService from "@/services/cohort2";
import ollamaService from "@/services/ollama";
import toast from "@/services/toast";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohort = defineModel("cohort", {
  type: Cohort,
  required: true,
});
const emit = defineEmits(["beforeSearch", "afterSearch", "commit"]);

const cohortsStore = useCohortsStore();
const { totalParticipants, cohorts } = storeToRefs(cohortsStore);

const canon_query = ref(transformQueryForApi(cohort.value.criteria));

function search(query) {
  emit("beforeSearch");
  return cohortService
    .searchParticipants({
      schema: config.cohort.schema.phenotype,
      criteria: query,
      search_id: cohort.value.search_id,
      save_results: true,
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
    });
}

// for every change in the query, transform it to the API query format (canonical query)
watchDebounced(
  () => cohort.value.criteria,
  (newQuery) => {
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
// deep compare old and new canonical queries to avoid unnecessary API calls
// if the query has changed, call the API to get the count of participants
// set cohort as dirty
watch(
  canon_query,
  (newQuery, oldQuery) => {
    if (isAPIQueryEmpty(newQuery)) {
      cohort.value.size = totalParticipants.value;
      if (!isAPIQueryEmpty(oldQuery)) emit("commit");
      return;
    }
    if (JSON.stringify(oldQuery) !== JSON.stringify(newQuery)) {
      console.log("Cohort query changed", newQuery, oldQuery);

      cohort.value.is_dirty = true;
      search(newQuery).then(() => {
        // wait for the search to finish before committing the criteria and new size to history
        console.log("Committing cohort");
        emit("commit");
      });
      ollamaService
        .generate_name_description({ criteria: newQuery })
        .then((res) => {
          cohort.value.suggested_name = res.data.name;
          cohort.value.suggested_description = res.data.description;
        })
        .catch((error) => {
          console.error("Error generating name and description", error);
        });
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

// when a cohort component is mounted, if it is dirty with a non-empty query, search and save so that combine can be done
onMounted(() => {
  if (cohort.value.is_dirty && !cohort.value.isEmpty()) {
    search(canon_query.value);
  }
});
</script>
