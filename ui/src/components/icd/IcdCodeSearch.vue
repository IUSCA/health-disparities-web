<template>
  <div class="h-screen">
    <div class="flex-grow">
      <Multiselect
        v-model="searchInput"
        mode="single"
        placeholder="Start typing to search ICD codes"
        close-on-select
        clear-on-select
        :filter-results="false"
        :min-chars="1"
        resolve-on-load
        :delay="0"
        :searchable="true"
        :options="debouncedSearch"
        noOptionsText="Search to see available options"
        noResultsText="No options available"
        :loading="loading"
        class="qb-multiselect w-full"
      />
    </div>

    <VaInnerLoading :loading="loading">
      <div class="flex mt-5">
        <div
          class="w-9/12 overflow-scroll md:border-r md:border-solid md:border-gray-500 md:pr-3"
        >
          <!-- hack to keep the tree expanded - assign a new unique value to key to force re-render the component -->
          <VaTreeView
            v-model:checked="selectedNodes"
            :nodes="nodes"
            selectable
            trackBy="concept_id"
            :valueBy="(x) => x.concept_code"
            :expand-all="expandAll"
            :key="`${expandAll}-${lastSearchedAt}`"
            class="whitespace-nowrap"
          >
            <!-- :color="stringToRGB('12345' + node.concept_code[0] + '678910')" -->
            <template #content="node">
              <div class="flex">
                <div class="flex-none flex items-center">
                  <span class="font-semibold mr-2">{{
                    node.concept_code
                  }}</span>

                  <!-- concept name -->
                  <span> {{ node.concept_name }} </span>

                  <!-- domain id icon -->
                  <div
                    v-if="node.domain_id"
                    :title="`Domain: ${node.domain_id}`"
                    class="ml-1"
                  >
                    <Icon
                      :icon="`mdi-alphabet-${node.domain_id.toLowerCase()[0]}-circle-outline`"
                    />
                  </div>

                  <!-- is match icon -->
                  <div class="ml-1" title="Better Match">
                    <i-mdi:alphabet-m-box-outline
                      v-if="node.is_a_search_result"
                      class="text-[var(--va-success)]"
                    />
                  </div>
                </div>
              </div>
            </template>
          </VaTreeView>
        </div>
        <div class="w-3/12 pl-3">
          <div class="text-base">
            Selected Codes:
            <span class="font-semibold"> {{ selectedNodes.length }} </span>
          </div>

          <ul class="min-h-[400px] max-h-[calc(100vh-14rem)] overflow-scroll">
            <li v-for="node in selectedNodes.sort()" :key="node">
              <!-- <div>{{ node.concept_code }} - {{ node.concept_name }}</div> -->
              <span>{{ node }}</span>
            </li>
          </ul>
        </div>
      </div>
    </VaInnerLoading>
  </div>
</template>

<script setup>
import { createTree, formatTree } from "@/components/icd/tree_utils";
import icd10Service from "@/services/icd10";
import Multiselect from "@vueform/multiselect";

const selectedNodes = defineModel({
  type: Array,
  default: () => [],
});

// const props = defineProps({})
const searchInput = ref([]);
const loading = ref(false);
const typeahead_loading = ref(false);
const nodes = ref([]);
const expandAll = ref(true);
const lastSearchedAt = ref(new Date());

const debouncedSearch = useDebounceFn(getSuggestions, 300);

function getSuggestions(searchQuery) {
  if (searchQuery === "" || searchQuery == null) return Promise.resolve([]);
  // typeahead_loading.value = true;
  return icd10Service
    .typeahead(searchQuery)
    .then((res) => {
      return res.data.map((n) => `${n.concept_code} - ${n.concept_name}`);
    })
    .catch((err) => {
      console.error(err);
      return [];
    })
    .finally(() => {
      typeahead_loading.value = false;
    });
}

watch(searchInput, handleSearch);

function handleSearch() {
  loading.value = true;
  const code = searchInput.value.split(" - ")[0];
  icd10Service
    .getDescendants({ code })
    .then((res) => {
      const tree = createTree(res.data);
      const formattedTree = formatTree(tree);
      nodes.value = formattedTree.children;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
      lastSearchedAt.value = new Date();
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
