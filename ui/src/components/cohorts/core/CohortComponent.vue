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
        <div class="mt-5" v-if="!cohort.is_locked && cohort.supports_editing">
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
          <div
            :class="cohort.is_locked ? 'locked-form pointer-events-none' : ''"
          >
            <component :is="resolveComponent(cohort)" v-model:cohort="cohort" />
          </div>
        </div>
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import { DEFAULT_LOGICAL_OPERATOR } from "@/components/cohorts/combination/constants";
import { Cohort } from "@/components/cohorts/models";
import genAIService from "@/services/gen_ai";
import toast from "@/services/toast";
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
const { totalParticipants, enableTitleGeneration } = storeToRefs(cohortsStore);
const loading = ref(false);

function resolveComponent(cohort) {
  if (cohort.schema.name === "phenotype") return PhenotypeCohortComponent;
  if (cohort.schema.name === "genotype") return GenotypeCohortComponent;
  if (cohort.schema.name === "combination") return CombinationCohortComponent;
  return null;
}

function search() {
  loading.value = true;
  emit("beforeSearch");
  return cohort.value
    .searchParticipants()
    .then(() => {
      emit("afterSearch");
    })
    .catch((err) => {
      toast.error("Error searching for participants");
      emit("afterSearch", err);
    })
    .finally(() => {
      constrainedCommit();
      loading.value = false;
    });
}

// getter source ()=>cohort.value.query with deep watch does not provice old value
// but returning the shallow copy somehow does
watchDebounced(
  () => ({ ...cohort.value.query }),
  (newQuery, oldQuery) => {
    if (oldQuery == null) return; // ignore the initial call -- when cohort is added to the store
    if (cohort.value.isEmpty(newQuery)) {
      cohort.value.size = totalParticipants.value;
      if (!cohort.value.isEmpty(oldQuery)) {
        constrainedCommit();
      }
      return;
    }

    search();

    // gen-ai services
    if (enableTitleGeneration.value && cohort.value.supports_genai) {
      genAIService
        .generate_name_description({ filters: newQuery })
        .then((res) => {
          cohort.value.suggested_name = res.data.title;
          cohort.value.suggested_description = res.data.description;
        })
        .catch((error) => {
          console.error("Error generating name and description", error);
        });
    }
  },
  {
    deep: true,
    debounce: 300,
    immediate: true,
  },
);

/* ***** cohort actions - start ****** */
function exportCohort() {}

// clone the cohort, save it, and append it to the store
function copyCohort() {
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
    query: JSON.parse(JSON.stringify(cohort.value.query)),
  }),
  set: ({ query }) => {
    // console.log("Setting cohort.query", JSON.stringify(query, null, 2));
    // console.log("previous value", JSON.stringify(cohort.value.query, null, 2));
    cohort.value.query = query;
  },
});

const { history, commit, undo, redo, canUndo, canRedo } = useManualRefHistory(
  stateToTrack,
  {
    clone: true,
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
