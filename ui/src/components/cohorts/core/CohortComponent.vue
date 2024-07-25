<template>
  <VaInnerLoading :loading="loading">
    <div class="flex flex-col md:flex-row gap-3">
      <!-- Info, Actions, History -->
      <div
        class="md:w-3/12 md:border-r md:border-solid md:border-gray-500 md:pr-3 min-w-[280px]"
      >
        <CohortInfo :cohort="cohort" :total-count="totalParticipants" />
        <div class="mt-3">
          <CohortActions
            :cohort="cohort"
            @saved="emit('saved')"
            @copy="copyCohort(cohort, idx)"
            @export="exportCohort(cohort, idx)"
            @remove="() => cohortsStore.deleteCohort(props.idx)"
          />
        </div>
        <div class="mt-5" v-if="!cohort.is_locked">
          <QueryHistory :history="history" @restore="restore" />
        </div>
      </div>

      <va-divider class="md:hidden" />

      <!-- undo, redo, clearFilters buttons, and query builder -->
      <div class="md:w-9/12">
        <!-- buttons -->
        <div
          class="flex items-center justify-end mb-2 md:mb-0 gap-3"
          v-if="!cohort.is_locked && cohort.supports_editing"
        >
          <!-- undo -->
          <VaButton
            size="small"
            preset="primary"
            :border-color="canUndo ? 'primary' : null"
            icon="undo"
            class=""
            round
            @click="undo"
            :disabled="!canUndo"
          >
            Undo
          </VaButton>

          <!-- redo -->
          <VaButton
            size="small"
            preset="primary"
            :border-color="canUndo ? 'primary' : null"
            icon="redo"
            class=""
            round
            @click="redo"
            :disabled="!canRedo"
          >
            Redo
          </VaButton>

          <!-- clear all filters -->
          <VaButton
            @click="cohort.clearQuery()"
            size="small"
            color="danger"
            icon="backspace"
            outline
            preset="primary"
            :disabled="cohort.isEmpty()"
          >
            Clear All Filters
          </VaButton>
        </div>
        <!-- query -->
        <div class="container">
          <div class="middle" v-if="cohort.is_locked">
            <i-mdi-lock class="text-3xl text-gray-600 dark:text-gray-100" />
          </div>
          <div :class="cohort.is_locked ? 'locked-form' : ''">
            <div :class="cohort.is_locked ? 'pointer-events-none' : ''">
              <component
                :is="resolveComponent(cohort)"
                v-model:cohort="cohort"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import { DEFAULT_LOGICAL_OPERATOR } from "@/components/cohorts/combination/constants";
import { Cohort } from "@/components/cohorts/models";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
import CombinationCohortComponent from "./CombinationCohortComponent.vue";
import GenotypeCohortComponent from "./GenotypeCohortComponent.vue";
import PhenotypeCohortComponent from "./PhenotypeCohortComponent.vue";

const cohort = defineModel("cohort", {
  type: Cohort,
  required: true,
});
const props = defineProps({
  idx: Number,
});
const emit = defineEmits(["saved", "beforeSearch", "afterSearch"]);

const cohortsStore = useCohortsStore();
const { totalParticipants } = storeToRefs(cohortsStore);
const loading = ref(false);

function resolveComponent(cohort) {
  if (cohort.schema.name === "phenotype") return PhenotypeCohortComponent;
  if (cohort.schema.name === "genotype") return GenotypeCohortComponent;
  if (cohort.schema.name === "combination") return CombinationCohortComponent;
  return null;
}

function search() {
  emit("beforeSearch");
  return cohort.value
    .searchParticipants()
    .then(() => {
      emit("afterSearch");
    })
    .catch((err) => {
      emit("afterSearch", err);
    })
    .finally(() => {
      constrainedCommit();
    });
}

// watch for changes in the query
// deep compare old and new queries to avoid unnecessary API calls
// if the query has changed (debounce), call the API to get the count of participants
// set cohort as dirty
// emits beforeSearch before API call
// emits afterSearch after API call succeeds or afterSearch with error if API call fails
// updates cohort's size and search_id with the API response
// commit finally after the API call (success or failure)
watchDebounced(
  () => cohort.value.query,
  (newQuery, oldQuery) => {
    if (cohort.value.isEmpty(newQuery)) {
      cohort.value.size = totalParticipants.value;
      if (!cohort.value.isEmpty(oldQuery)) {
        constrainedCommit();
      }
      return;
    }

    if (JSON.stringify(oldQuery) !== JSON.stringify(newQuery)) {
      console.log("Cohort query changed", newQuery, oldQuery);

      cohort.value.is_dirty = true;
      search();

      // gen-ai services
    }
  },
  {
    deep: true,
    debounce: 300,
  },
);

// when a cohort component is mounted, if it is dirty with a non-empty query, search and save so that combine can be done
onMounted(() => {
  if (cohort.value.is_dirty && !cohort.value.isEmpty()) {
    search();
  }
});

/* ***** cohort actions - start ****** */
function exportCohort() {
  console.log("Export cohort", cohort.value, props.idx);
}

function copyCohort() {
  // clone the cohort, save it, and append it to the store
  console.log("Copy cohort", cohort.value, props.idx);
  loading.value = true;
  const cohortCopy = cohort.value.copy();
  cohortCopy
    .save()
    .then(() => {
      cohortsStore.appendCohort(cohortCopy, DEFAULT_LOGICAL_OPERATOR);
    })
    .catch((error) => {
      console.error("Error copying cohort", error);
    })
    .finally(() => {
      loading.value = false;
    });
}
/* ***** cohort actions - end ****** */

/* ***** history management - start ***** */
const stateToTrack = computed({
  get: () => ({
    size: cohort.value.size,
    query: cohort.value.query,
  }),
  set: ({ query }) => {
    cohort.value.query = query;
  },
});

const { history, commit, undo, redo, canUndo, canRedo } = useManualRefHistory(
  stateToTrack,
  {
    capacity: 30,
  },
);

function constrainedCommit() {
  // when undo or redo is called, the query is set. this triggers another commit
  // to the history. we don't want that, so we check if the query is different
  // from the last commit
  if (
    JSON.stringify(cohort.value.query) !==
    JSON.stringify(history.value[0].snapshot.query)
  ) {
    commit();
  }
}

function restore(item) {
  cohort.value.query = item.snapshot.query;
}
/* ***** history management - end ***** */
</script>

<style scoped lang="scss">
.container {
  position: relative;
}

.locked-form {
  opacity: 1;
  display: block;
  width: 100%;
  height: auto;
  transition: 0.5s ease;
  backface-visibility: hidden;
}

.container:hover .locked-form {
  opacity: 0.3;
}

.middle {
  opacity: 0;
  transition: 0.5s ease;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  text-align: center;
}

.container:hover .middle {
  opacity: 1;
}
</style>
