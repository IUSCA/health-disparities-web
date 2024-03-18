<template>
  <VaInnerLoading :loading="loading">
    <div class="flex flex-col md:flex-row gap-3">
      <div
        class="md:w-3/12 md:border-r md:border-solid md:border-gray-500 md:pr-3 min-w-[280px]"
      >
        <CohortInfo :cohort="cohort" :total-count="totalParticipants" />
        <div class="mt-3">
          <CohortActions
            :cohort="cohort"
            @export="exportCohort(cohort, idx)"
            @remove="() => cohortsStore.deleteCohort(props.idx)"
          />
        </div>
        <div class="mt-5" v-if="!cohort.is_locked">
          <QueryHistory :history="history" @restore="restore" />
        </div>
      </div>

      <va-divider class="md:hidden" />

      <div class="md:w-9/12">
        <!-- undo button -->
        <div
          class="flex items-center justify-end mb-2 md:mb-0 gap-3"
          v-if="!cohort.is_locked && cohort.supports_editing"
        >
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

          <VaButton
            @click="clearFilters"
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
        <component
          :is="resolveComponent(cohort)"
          v-model:cohort="cohort"
          @beforeSearch="handleBeforeSearch"
          @afterSearch="handleAfterSearch"
          @commit="constrainedCommit"
        />
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import CombinedCohortComponent from "@/components/builder/cohorts/CombinedCohortComponent.vue";
import GenotypeCohortComponent from "@/components/builder/cohorts/GenotypeCohortComponent.vue";
import PhenotypeCohortComponent from "@/components/builder/cohorts/PhenotypeCohortComponent.vue";
import { Cohort } from "@/components/builder/models";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohort = defineModel("cohort", {
  type: Cohort,
  required: true,
});
const props = defineProps({
  idx: Number,
});
const emit = defineEmits(["beforeSearch", "afterSearch"]);

const cohortsStore = useCohortsStore();
const { totalParticipants } = storeToRefs(cohortsStore);
const loading = ref(false);

function resolveComponent(cohort) {
  if (cohort.schema.name === "phenotype") return PhenotypeCohortComponent;
  if (cohort.schema.name === "genotype") return GenotypeCohortComponent;
  if (cohort.schema.name === "combination") return CombinedCohortComponent;
  return null;
}

function handleBeforeSearch() {
  loading.value = true;
  emit("beforeSearch");
}

function handleAfterSearch() {
  loading.value = false;
  emit("afterSearch");
}

function exportCohort() {
  console.log("Export cohort", cohort.value, props.idx);
}

const stateToTrack = computed({
  get: () => ({
    size: cohort.value.size,
    criteria: cohort.value.criteria,
  }),
  set: ({ criteria }) => {
    cohort.value.criteria = criteria;
  },
});

const { history, commit, undo, redo, canUndo, canRedo } = useManualRefHistory(
  stateToTrack,
  {
    capacity: 30,
  },
);

function constrainedCommit() {
  // when undo or redo is called, the criteria is set. this triggers another commit
  // to the history. we don't want that, so we check if the criteria is different
  // from the last commit
  if (
    JSON.stringify(cohort.value.criteria) !==
    JSON.stringify(history.value[0].snapshot.criteria)
  ) {
    commit();
  }
}

function restore(item) {
  cohort.value.criteria = item.snapshot.criteria;
}

const clearFilters = () => {
  cohort.value.criteria = cohort.value.defaultCriteria();
};
</script>
