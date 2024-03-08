<template>
  <div class="flex-grow">
    <Multiselect
      v-model="model"
      mode="tags"
      placeholder="Type to search..."
      :close-on-select="false"
      :filter-results="false"
      :min-chars="1"
      :resolve-on-load="false"
      :delay="0"
      :searchable="true"
      :options="debouncedSearch"
      noOptionsText="Search to see available options"
      noResultsText="No options available"
      :loading="loading"
      class="qb-multiselect text-sm w-full"
      breakTags
    />
  </div>
</template>

<script setup>
import cohortsService from "@/services/cohort2";
import Multiselect from "@vueform/multiselect";
// const props = defineProps({});

const model = defineModel();
const loading = ref(false);

const debouncedSearch = useDebounceFn(fecthMatchingOptions, 500);

function fecthMatchingOptions(searchQuery) {
  console.log("searchQuery", searchQuery);
  loading.value = true;
  return cohortsService
    .dxNameAutoComplete(searchQuery)
    .then((res) => {
      console.log(res);
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
}
</style>
