<template>
  <va-card>
    <va-card-content>
      <div class="flex flex-wrap items-center gap-y-3">
        <!-- combination result -->
        <CombinedCohortInfo v-if="cohorts.length >= 2" />
        <!-- array of cohorts -->
        <CohortsWithOperators
          :cohorts="cohorts"
          :logicalOperators="logicalOperators"
          @updateLogicalOperator="changeCombinationLogic"
        />

        <!-- Add cohort button -->
        <AddCohortButton />
      </div>
    </va-card-content>
  </va-card>

  <CombinationLogicModal ref="combinationLogicModal" />
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const { cohorts, operators: logicalOperators } = storeToRefs(cohortsStore);

// const props = defineProps({});

const combinationLogicModal = ref(null);

function changeCombinationLogic(left_operand_idx) {
  combinationLogicModal.value.show(left_operand_idx);
}
</script>
