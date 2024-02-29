<template>
  <div>
    <div class="mb-2">Cohorts are combined in this precise manner:</div>
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
const expression = computed(() => {
  const numOperators = operators.value.length;
  const leftParentheses = "(".repeat(numOperators);
  const body = cohorts.value
    .map((cohort, index) => {
      const operator =
        index < numOperators ? combinations[operators.value[index]].html : "";
      const rightParentheses = index > 0 ? ")" : "";
      return ` "${cohort.name}" ${rightParentheses} ${operator}`;
    })
    .join("");
  return leftParentheses + body;
});
// const props = defineProps({});
</script>
