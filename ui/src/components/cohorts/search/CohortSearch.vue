<template>
  <div>
    <CohortSearchFilters
      v-model:params="params"
      @reset="reset"
      class="mb-3 w-full"
    />
    <CohortTable
      :params="params"
      @select="(x) => emit('select', x)"
      :selected="cohort_ids"
      :show-delete="params.is_mine"
    />
  </div>
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
// const props = defineProps({});

const { cohorts } = storeToRefs(useCohortsStore());
const cohort_ids = computed(() => cohorts.value.map((c) => c.id));

const emit = defineEmits(["select"]);

const defaultParams = () => ({
  search_term: "",
  is_published: "",
  is_locked: "",
  is_mine: true,
  type: "",
});
const params = ref(defaultParams());
function reset() {
  params.value = defaultParams();
}
</script>
