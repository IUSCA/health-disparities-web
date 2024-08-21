<template>
  <!-- AI checkboxes -->
  <CohortAICheckboxes />

  <div>
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
              @beforeSearch="(...params) => handleBeforeSearch(idx, ...params)"
              @afterSearch="(...params) => handleAfterSearch(idx, ...params)"
            />
          </VaCardContent>
        </VaCard>
      </div>

      <!-- user chooses a cohort to view its participants data / visualization -->
      <!-- if that cohort "updates" (participants change), fetch data -->
      <div class="">
        <VaCard>
          <VaCardContent>
            <CohortData :last-updated="lastUpdated" />
          </VaCardContent>
        </VaCard>
      </div>
    </VaInnerLoading>
  </div>
  <Chat @message="handleUserMessage" ref="chat" v-if="enableChatbot" />
</template>

<script setup>
import { DEFAULT_LOGICAL_OPERATOR } from "@/components/cohorts/combination/constants";
import {
  CombinationCohort,
  createCohort,
  PhenotypeCohort,
} from "@/components/cohorts/models";
import cohortService from "@/services/cohorts";
import genAIService from "@/services/gen_ai";
import participantsService from "@/services/participants";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const route = useRoute();
const router = useRouter();

const {
  cohorts,
  enableChatbot,
  totalParticipants,
  combinationCohort,
  operators,
  isInCombineMode,
} = storeToRefs(cohortsStore);

const globalLoading = ref(false);
const lastUpdated = ref(Date.now());
const numCohorts = computed(() => cohorts.value.length);

onMounted(() => {
  participantsService.getTotalCount().then((res) => {
    totalParticipants.value = res.data.total;
  });

  // check if the route has a query parameter id
  // if it does, load the cohort
  if (route.query.id) {
    loadCohort(route.query.id).finally(() => {
      if (numCohorts.value === 0) {
        router.replace("/cohorts");
      }
    });
  } else {
    if (numCohorts.value === 0) {
      router.replace("/cohorts");
    }
  }
});

onUnmounted(() => {
  // reset the store
  cohortsStore.reset();
});

// prevent navigation when there are unsaved changes
onBeforeRouteLeave(() => {
  const anyEditedCohorts = cohorts.value.some((c) => c.hasUnsavedChanges());
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
    const cohort_ids = cohorts.value.map((c) => c.getLatestId());

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
// todo: deduplicate the calls to checkAndCombine from
// possible "collision" of afterSearch and watch([numCohorts, operators])

watch(
  [numCohorts, operators],
  () => {
    checkAndCombine().finally(() => {
      globalLoading.value = false;
      lastUpdated.value = Date.now();
    });
  },
  { deep: true },
);

watch(numCohorts, (value) => {
  if (value === 0) {
    router.replace("/cohorts");
  }
});

function handleBeforeSearch() {
  // when in combine mode, show global loading to prevent user from interacting with the other cohorts or operators
  // after the search is done, another api call to combine is done and then the global loading will be turned off
  if (isInCombineMode.value) globalLoading.value = true;
}

function handleAfterSearch(idx, err) {
  // if there is an error with cohort search
  // abandon the combine search
  if (err) {
    globalLoading.value = false;
  } else {
    globalLoading.value = true;
    checkAndCombine().finally(() => {
      globalLoading.value = false;
      lastUpdated.value = Date.now();
    });
  }
}

// load the cohort from the server and update store
// if it is a combination cohort, load the cohorts that are part of the combination
function loadCohort(id) {
  return cohortService.getById(id).then((res) => {
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
      return Promise.all(promises).then((operand_cohorts) => {
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
  genAIService
    .generate_cohort({ text })
    .then((res) => {
      const cohort = new PhenotypeCohort({ query: res.data.query.body });
      cohortsStore.appendCohort(cohort, DEFAULT_LOGICAL_OPERATOR);
      chat.value.addBotMessage("Done!");
    })
    .catch((err) => {
      console.error(err);
      chat.value.addBotMessage("Unable to generate cohort. Please try again.");
    });
}
</script>

<route lang="yaml">
meta:
  title: Cohort Builder
  nav: [{ label: "Cohorts", to: "/cohorts" }, { label: "Builder" }]
</route>

<style scoped lang="scss">
.cohort-card {
  --va-card-padding: 0.75rem;
}

/* image is from 
https://freeillustrations.xyz/illustration/technology-illustrations/ and 
https://www.reshot.com/free-vector-illustrations/item/robot-scientist-N8RWCS437D/ 
*/
.illustration-bg {
  background-image: url("/illustration.svg");
}
</style>
