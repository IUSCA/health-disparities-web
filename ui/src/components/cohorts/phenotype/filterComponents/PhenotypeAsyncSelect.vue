<template>
  <div class="flex-grow">
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
      searchPlaceholderText="Type to search..."
    >
    </VaSelect>
  </div>
</template>

<script setup>
import phenotypesService from "@/services/phenotypes";

const model = defineModel();
const props = defineProps({
  identifier: String,
  separator: {
    type: String,
    default: ".",
  },
  debounceMs: {
    type: Number,
    default: 300,
  },
});

const options = ref([]);
const loading = ref(false);

const noResults = ref(false);
const noOptionsText = computed(() => {
  return loading.value
    ? "Loading options..."
    : noResults.value
      ? "No options available"
      : "Search to see available options";
});
const deboundeSearch = useDebounceFn(handleSearch, props.debounceMs);

function fecthMatchingOptions(search) {
  const [category, field] = props.identifier.split(props.separator);
  return phenotypesService
    .textFieldAutoComplete(category, field, search)
    .then((res) => {
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

<style scoped lang="scss">
:deep(.cohort-builder-select) {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
}
// for options in dropdown. make the font smaller and let the height be determined by the content
:deep(.custom-options) {
  .va-select-option {
    font-size: 0.75rem;
    line-height: 1rem;
    min-height: 1.75rem;
    flex: none;
  }
}
</style>
