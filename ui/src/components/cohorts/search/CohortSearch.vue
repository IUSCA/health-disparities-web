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
      :show-actions="props.showActions"
    />
  </div>
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const { cohorts } = storeToRefs(useCohortsStore());
const cohort_ids = computed(() => cohorts.value.map((c) => c.id));

const props = defineProps({
  showActions: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["select"]);

const defaultParams = () => ({
  search_term: "",
  type: "",
  view_mode: "created_by_me",
  status: "all",
});
const params = ref(defaultParams());
function reset() {
  console.log("reset");
  params.value = defaultParams();
}
</script>
