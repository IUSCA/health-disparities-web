<template>
  <VaSelect
    v-model="model"
    :options="options"
    class="text-sm cohort-builder-select w-full"
    multiple
    :loading="loading"
    :max-visible-options="3"
    selected-top-shown
    searchable
    :highlight-matched-text="false"
    @updateSearch="deboundeSearch"
    :noOptionsText="noOptionsText"
    searchPlaceholderText="Search to see available options"
  >
  </VaSelect>
  <div>
    {{ model }}
  </div>
</template>

<script setup>
import cohortsService from "@/services/cohort2";

const model = defineModel();
// const props = defineProps({});

const options = ref([]);
const loading = ref(false);

const noResults = ref(false);
const noOptionsText = computed(() => {
  return loading.value
    ? "Loading options..."
    : noResults.value
      ? "No options available"
      : "";
});
const deboundeSearch = useDebounceFn(handleSearch, 500);

function fecthMatchingOptions(search) {
  return cohortsService
    .dxNameAutoComplete(search)
    .then((res) => {
      console.log(res);
      return res.data;
    })
    .catch((err) => {
      console.error(err);
      return [];
    });
}

function updateOptions(opts) {
  // remove from opts that are already in model
  const new_opts = opts.filter((op) => !model.value.includes(op));

  // set options as model + new_opts
  options.value = [...model.value, ...new_opts];
}

function handleSearch(search) {
  if (search === "") {
    noResults.value = false;
  } else {
    loading.value = true;
    fecthMatchingOptions(search)
      .then((res) => {
        updateOptions(res);
        noResults.value = res.length === 0;
      })
      .finally(() => {
        loading.value = false;
      });
  }
}
</script>
