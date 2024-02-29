<template>
  <va-modal
    v-model="visible"
    title="Select a logical operator"
    fixed-layout
    close-button
    @ok="handleUpdate"
    @close="hide"
    class="z-10"
  >
    <div class="flex flex-col gap-7">
      <div class="flex gap-5">
        <span>Selected Cohorts: </span>
        <p>
          <span class="font-semibold"> {{ cohorts[idx].name }} </span> (A)
        </p>
        <p>
          <span class="font-semibold"> {{ cohorts[idx + 1].name }} </span> (B)
        </p>
      </div>
      <CombineCohortsForm v-model="logicalOperator" />
      <CohortCombinationPrecedence />
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
