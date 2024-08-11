<template>
  <div class="h-screen">
    <div class="mb-5">
      <div class="flex mb-3 gap-3">
        <!-- search bar -->
        <div class="flex-1">
          <va-input
            v-model="filterInput"
            class="w-full"
            :placeholder="`Search ICD-10 codes`"
            outline
            clearable
            input-class="search-input"
            @keydown.enter="handleSearch"
          >
            <template #prependInner>
              <Icon icon="material-symbols:search" class="text-xl" />
            </template>
          </va-input>
        </div>

        <!-- search button -->
        <div class="flex-none flex items-center justify-center">
          <VaButton @click="handleSearch" :disabled="!filterInput"
            >Search</VaButton
          >
        </div>
      </div>

      <!-- Synonyms -->
      <div class="my-5 flex flex-nowrap items-center" v-if="showSynonyms">
        <span class="font-semibold flex-none mr-3">Similar Terms:</span>
        <IcdSynonyms
          :keyword="lastSearchKeyword"
          @search="
            (keyword) => {
              filterInput = keyword;
              handleSearch();
            }
          "
        />
      </div>
    </div>

    <!-- tree and selections -->
    <VaInnerLoading :loading="loading">
      <div class="mb-5" v-if="fallback && !noResultsFound">
        <VaAlert color="info" icon="info">
          The search query did not return any results. Displaying results that
          match any of the keywords.
        </VaAlert>
      </div>
      <div v-if="noResultsFound">
        <VaAlert title="No results found" color="warning" icon="warning">
          Please refine your search to get more accurate results.
        </VaAlert>
      </div>
      <div class="flex" v-else>
        <div
          class="w-9/12 overflow-scroll md:border-r md:border-solid md:border-gray-500 md:pr-3"
        >
          <!-- checkboxes -->
          <div class="flex gap-3 my-1">
            <VaCheckbox v-model="expandAll" label="Expland All" class="" />
            <VaCheckbox
              v-model="highlightKeyword"
              label="Highlight Search Keyword"
              class=""
            />
            <VaCheckbox
              v-model="selectAll"
              label="Select All Matches"
              class=""
            />
          </div>
          <VaTreeView
            v-model:checked="selectedNodes"
            :nodes="nodes"
            selectable
            trackBy="concept_id"
            :valueBy="(x) => x.concept_code"
            :expand-all="expandAll"
            :key="expandAll"
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
                  <HighlightText
                    v-if="highlightKeyword"
                    :content="node.concept_name"
                    :keyword="lastSearchKeyword"
                  />
                  <span v-else> {{ node.concept_name }} </span>

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

const selectedNodes = defineModel({
  type: Array,
  default: () => [],
});

// const props = defineProps({})

const filterInput = ref("");
const nodes = ref([]);
const flatNodes = ref([]);
const expandAll = ref(false);
const highlightKeyword = ref(false);
const selectAll = ref(false);
const lastSearchKeyword = ref("");
const loading = ref(false);
const noResultsFound = ref(false);
const fallback = ref(false);
const showSynonyms = computed(() => {
  return (
    noResultsFound.value ||
    fallback.value ||
    (nodes.value.length > 0 && nodes.value.length <= 5)
  );
});

function handleSearch() {
  loading.value = true;
  nodes.value = [];
  selectAll.value = false;
  lastSearchKeyword.value = filterInput.value;
  noResultsFound.value = false;
  fallback.value = false;

  icd10Service
    .searchTree2({ keyword: filterInput.value })
    .then((res) => {
      const _nodes = res.data.matches || [];
      if (_nodes.length === 0) {
        noResultsFound.value = true;
      }
      if (res.data.match_type === "fallback") {
        fallback.value = true;
      }
      flatNodes.value = _nodes;
      const tree = createTree(_nodes);
      const formattedTree = formatTree(tree);
      nodes.value = formattedTree.children;
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      loading.value = false;
    });
}

watch(selectAll, (value) => {
  if (value) {
    selectedNodes.value = flatNodes.value.map((node) => node.concept_code);
  } else {
    selectedNodes.value = [];
  }
});
</script>

<style scoped></style>
