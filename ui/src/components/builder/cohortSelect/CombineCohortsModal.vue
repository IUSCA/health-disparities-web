<template>
  <va-modal
    v-model="visible"
    title="Combine Cohorts"
    fixed-layout
    close-button
    @ok="handleUpdate"
    @close="hide"
  >
    <CombineCohortsForm v-model="logicalOperator" />
    <CohortCombinationPrecedence />
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
const { operators } = storeToRefs(cohortsStore);

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
