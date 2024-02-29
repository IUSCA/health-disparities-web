<template>
  <va-modal
    v-model="visible"
    title="Combine Cohorts"
    fixed-layout
    close-button
    @ok="handleUpdate"
    @close="hide"
    class="z-10"
  >
    <div class="flex flex-col gap-7">
      <div class="flex flex-wrap">
        <span>Select a logical operator to combine </span>
        <p class="ml-5">
          <span class="font-semibold"> {{ cohorts[idx].name }} </span>
        </p>
        <span class="mx-5">with</span>
        <p>
          <span class="font-semibold"> {{ cohorts[idx + 1].name }} </span>
        </p>
      </div>
      <CombineCohortsForm v-model="logicalOperator" />
      <va-divider />
      <CohortCombinationPrecedence
        :idx="idx"
        :selected-operator-key="logicalOperator"
      />
    </div>
  </va-modal>
</template>

<script setup>
// const props = defineProps({});
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const cohortsStore = useCohortsStore();
const { cohorts, operators } = storeToRefs(cohortsStore);

const visible = ref(false);
const logicalOperator = ref(null);
let idx = null;

function hide() {
  visible.value = false;
}

function show(_idx) {
  visible.value = true;
  logicalOperator.value = operators.value[_idx];
  idx = _idx;
}

function handleUpdate() {
  cohortsStore.updateOperator(idx, logicalOperator.value);
  hide();
}
</script>
