<template>
  <!-- AI checkboxes -->
  <CohortAICheckboxes />

  <div v-if="cohorts.length === 0">
    <CohortBuilderLanding />
  </div>
  <div v-else>
    <!-- Cohort Selector -->
    <VaInnerLoading :loading="globalLoading">
      <div class="mb-5">
        <CohortSelector />
      </div>

      <div class="mb-5">
        <CombineValidationError :cohorts="cohorts" />
      </div>

      <!-- Cohorts -->
      <div class="flex flex-col gap-3 mb-5">
        <VaCard
          class="cohort-card"
          v-for="(cohort, idx) in cohorts"
          :key="cohort.id"
        >
          <VaCardContent
            :class="
              cohort.is_locked ? 'border border-solid border-slate-500' : ''
            "
          >
            <CohortComponent
              :idx="idx"
              :cohort="cohort"
              @update:cohort="(updatedCohort) => (cohorts[idx] = updatedCohort)"
              @beforeSearch="handleBeforeSearch"
              @afterSearch="handleAfterSearch"
            />
          </VaCardContent>
        </VaCard>
      </div>

      <!-- user chooses a cohort to view its participants data / visualization -->
      <!-- if that cohort "updates" (participants change), fetch data -->
      <!-- <div class="">
        <VaCard>
          <VaCardContent>
            <CohortData />
          </VaCardContent>
        </VaCard>
      </div> -->
    </VaInnerLoading>
  </div>
  <Chat @message="handleUserMessage" ref="chat" v-if="enableChatbot" />
</template>

<script setup>
import { CombinationCohort, createCohort } from "@/components/cohorts/models";
import cohortService from "@/services/cohorts";
import participantsService from "@/services/participants";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const route = useRoute();

const {
  cohorts,
  enableChatbot,
  totalParticipants,
  combinationCohort,
  operators,
  isInCombineMode,
} = storeToRefs(cohortsStore);

const globalLoading = ref(false);

onMounted(() => {
  participantsService.getTotalCount().then((res) => {
    totalParticipants.value = res.data.total;
  });

  // check if the route has a query parameter id
  // if it does, load the cohort
  if (route.query.id) {
    loadCohort(route.query.id);
  }
});

// prevent navigation when there are unsaved changes
onBeforeRouteLeave(() => {
  const anyEditedCohorts = cohorts.value.some(
    (c) => c.is_dirty && !c.isEmpty(),
  );
  if (!anyEditedCohorts) return true;
  const answer = window.confirm(
    "Do you really want to leave? you have unsaved changes!",
  );
  // cancel the navigation and stay on the same page
  if (!answer) return false;
});

// when a cohort is added / removed (numCohorts changes)
// or when an operator is changed
// or when a cohort query is changed and search succeeds

// do a set operation on the cohorts if there is more than one cohort with non-empty query
// update cohort_ids and operators in combinationCohort (store)
function checkAndCombine() {
  if (isInCombineMode.value) {
    // get the ids of the cohorts to be combined
    // if the cohort is dirty, use the search_id
    // otherwise use the id (for saved cohorts)
    const cohort_ids = cohorts.value.map((c) =>
      c.is_dirty ? c.search_id : c.id,
    );

    // if some cohort_ids are null, exit early
    if (cohort_ids.some((id) => !id)) {
      console.log("some cohort_ids are null exit early", cohort_ids);
      return Promise.resolve();
    }
    combinationCohort.value.query.cohort_ids = cohort_ids;
    globalLoading.value = true;
    return combinationCohort.value.searchParticipants().catch((err) => {
      console.error(err);
    });
  }
  return Promise.resolve();
}
// deduplicate the calls to checkAndCombine from
// possible "collision" of afterSearch and watch([numCohorts, operators])

const numCohorts = computed(() => cohorts.value.length);
watch(
  [numCohorts, operators],
  () => {
    checkAndCombine().finally(() => {
      globalLoading.value = false;
    });
  },
  { deep: true },
);

// when number of cohorts goes from 1 to 2, search and save results so that combine can be done
// needed only if cohort is dirty but query is not empty
watch(numCohorts, (newVal, oldVal) => {
  if (newVal === 2 && oldVal === 1) {
    cohorts.value
      .filter((c) => c.is_dirty && !c.isEmpty())
      .forEach((c) => c.searchParticipants());
  }
});

function handleBeforeSearch() {
  // when in combine mode, show global loading to prevent user from interacting with the other cohorts or operators
  // after the search is done, another api call to combine is done and then the global loading will be turned off
  if (isInCombineMode.value) globalLoading.value = true;
}

function handleAfterSearch(err) {
  // if there is an error with cohort search
  // abandon the combine search
  if (err) {
    globalLoading.value = false;
  } else {
    globalLoading.value = true;
    checkAndCombine().finally(() => {
      globalLoading.value = false;
    });
  }
}

// load the cohort from the server and update store
// if it is a combination cohort, load the cohorts that are part of the combination
function loadCohort(id) {
  cohortService.get(id).then((res) => {
    const cohort = createCohort(res.data);
    if (cohort instanceof CombinationCohort) {
      combinationCohort.value = cohort;

      // load the cohorts that are part of the combination
      const promises = cohort.query.cohort_ids.map((id) => {
        return cohortService.getById(id).then((res) => {
          return createCohort(res.data);
        });
      });
      // wait for all the cohorts to be loaded
      // set the cohorts ref in store
      Promise.all(promises).then((operand_cohorts) => {
        cohorts.value = operand_cohorts;
      });
    } else {
      // other types of cohorts - single
      cohortsStore.appendCohort(cohort);
    }
  });
}

const chat = ref(null);
function handleUserMessage(text) {
  console.log("handleUserMessage", text);
  // genAIService
  //   .generate_cohort({ text })
  //   .then((res) => {
  //     const cohort = PhenotypeCohort.createEmpty();
  //     cohort.criteria = transformStoredQuery(res.data.criteria);
  //     cohortsStore.appendCohort(cohort, DEFAULT_LOGICAL_OPERATOR);
  //     chat.value.addBotMessage("Done!");
  //   })
  //   .catch((err) => {
  //     console.error(err);
  //     chat.value.addBotMessage("Unable to generate cohort. Please try again.");
  //   });
}
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
