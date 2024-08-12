<template>
  <div>
    <CohortSearchFilters
      v-model:params="params"
      @reset="reset"
      class="mb-3 w-full"
    />
    <CohortTable :params="params" @select="(x) => emit('select', x)" />
  </div>
</template>

<script setup>
// const props = defineProps({});

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
