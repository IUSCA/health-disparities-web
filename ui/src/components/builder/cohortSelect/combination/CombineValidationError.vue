<template>
  <div v-if="cohorts.length > 1 && cohortsWithEmptyQueries.length > 0">
    <VaAlert color="warning" icon="warning">
      <div class="md:ml-3">
        <span class="font-semibold text-lg">
          Combining cohorts with empty queries is not allowed. Please remove the
          cohorts with empty queries or add filters to them.
        </span>
        <p>Empty Cohorts:</p>
        <ul class="list-disc ml-5">
          <li v-for="c in cohortsWithEmptyQueries" :key="c.id">{{ c.name }}</li>
        </ul>
      </div>
    </VaAlert>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";

import { useCohortsStore } from "@/stores/cohorts";
// const props = defineProps({})

const cohortsStore = useCohortsStore();
const { cohorts, cohortsWithEmptyQueries } = storeToRefs(cohortsStore);
</script>
