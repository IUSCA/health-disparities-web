<template>
  <div class="flex-grow">
    <Multiselect
      v-model="model"
      mode="tags"
      placeholder="Type to search..."
      :close-on-select="false"
      :filter-results="false"
      :min-chars="1"
      resolve-on-load
      :delay="0"
      :searchable="true"
      :options="debouncedSearch"
      noOptionsText="Search to see available options"
      noResultsText="No options available"
      :loading="loading"
      class="qb-multiselect text-sm w-full"
      breakTags
      :allow-absent="true"
    />
  </div>
</template>

<script setup>
import cohortsService from "@/services/cohort2";
import Multiselect from "@vueform/multiselect";
// const props = defineProps({});

const model = defineModel();
const loading = ref(false);

const debouncedSearch = useDebounceFn(fecthMatchingOptions, 300);

function fecthMatchingOptions(searchQuery) {
  if (searchQuery === "" || searchQuery == null) return Promise.resolve([]);
  loading.value = true;
  return cohortsService
    .dxNameAutoComplete(searchQuery)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.error(err);
      return [];
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>

<style src="@vueform/multiselect/themes/default.css"></style>

<style scoped lang="scss">
.qb-multiselect {
  --ms-max-height: 20rem;
  --ms-border-color: var(--va-background-border);
  --ms-bg: var(--va-background-secondary);
  --ms-dropdown-bg: var(--va-background-secondary);
  --ms-dropdown-border-color: var(--va-background-border);
  --ms-option-bg-pointed: var(--va-text-selected);
}
:deep(.qb-multiselect) {
  input.multiselect-tags-search {
    background-color: var(--va-background-secondary);
  }
  .multiselect-clear {
    z-index: 0;
  }
}
</style>
