<template>
  <div v-if="props.cohorts.length > 1 && cohortsWithEmptyQueries.length > 0">
    <VaAlert color="warning" icon="warning">
      <div class="md:ml-3">
        <p class="font-semibold text-lg">
          Some cohorts do not contain any filters.
        </p>
        <p>
          Please either remove the cohorts without any queries or add some
          filters to them.
        </p>
        <p class="mt-2">Here are the empty cohorts:</p>
        <ul class="list-disc ml-5">
          <li v-for="c in cohortsWithEmptyQueries" :key="c.id">
            <div class="flex gap-1 items-center my-1">
              <span> {{ c.name }} </span>
              <VaButton
                preset="secondary"
                size="small"
                icon="close"
                color="danger"
                @click="emit('remove', c.id)"
                title="Remove cohort"
              ></VaButton>
            </div>
          </li>
        </ul>
      </div>
    </VaAlert>
  </div>
</template>

<script setup>
// import { storeToRefs } from "pinia";

// import { useCohortsStore } from "@/stores/cohorts";

// const cohortsStore = useCohortsStore();
// const { cohorts, cohortsWithEmptyQueries } = storeToRefs(cohortsStore);

const props = defineProps({
  cohorts: Array,
});

const emit = defineEmits(["remove"]);

const cohortsWithEmptyQueries = computed(() => {
  return props.cohorts.filter((c) => c.isEmpty());
});
</script>
