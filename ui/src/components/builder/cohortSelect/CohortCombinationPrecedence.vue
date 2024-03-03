<template>
  <div>
    <div class="mb-2">Order of evaluation:</div>
    <pre
      class="text-sm whitespace-pre-wrap break-words p-3"
      style="background-color: var(--va-background-element)"
      v-html="expression"
    ></pre>
  </div>
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
import { combinations } from "./combineCohorts";

const cohortsStore = useCohortsStore();
const { cohorts, operators } = storeToRefs(cohortsStore);

const props = defineProps({
  idx: Number,
  selectedOperatorKey: String,
});

function getOperator(index) {
  // assume that the index is always valid
  if (index === props.idx) {
    return props.selectedOperatorKey;
  } else {
    return operators.value[index];
  }
}

const expression = computed(() => {
  const numOperators = operators.value.length;
  const leftParentheses = "(".repeat(numOperators);
  const body = cohorts.value
    .map((cohort, index) => {
      const operator =
        index < numOperators ? combinations[getOperator(index)].html : "";
      const rightParentheses = index > 0 ? ")" : "";
      return [` "${cohort.name}"`, rightParentheses, operator]
        .filter((x) => x)
        .join(" ");
    })
    .join("");
  return leftParentheses + body;
});
// const props = defineProps({});
</script>
