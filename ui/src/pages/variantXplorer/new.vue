<template>
  <div class="flex flex-col gap-3">
    <VaCard>
      <VaCardContent>
        <div class="flex items-center gap-3">
          <SourceSelect v-model="source" class="flex-none" />
          <SnapshotSelect v-model="snapshot" class="flex-none" />
          <VariantSearchInput
            v-model="query"
            :example_searches="example_searches"
            @clear="reset"
          />
          <!-- <VaButton @click="reset"> Add </VaButton> -->
        </div>

        <!-- Selected ranges -->
        <!-- <div>
          <div class="flex items-center gap-3">
            <div class="flex-none">Selected ranges:</div>
            <div class="flex-1"></div>
          </div>
        </div> -->
      </VaCardContent>
    </VaCard>

    <VaButton @click="() => columnOrderingModal.show()"> Columns </VaButton>

    <!-- results table -->
    <div v-if="resultsView">
      <VariantResultsTable
        :results="variants"
        :loading="loading"
        :total_count="total_count"
      />
    </div>

    <!-- search examples -->
    <div class="flex flex-col justify-center items-center mt-24" v-else>
      <!-- loading spinner -->
      <div v-if="loading" class="flex justify-center items-center mt-24">
        <span>loading</span>
        <semipolar-spinner
          :animation-duration="2000"
          :size="65"
          :color="colors.primary"
        />
      </div>
      <VariantSearchExample
        v-else
        :example_searches="example_searches"
        @search="(val) => (query = val)"
      />
    </div>
  </div>

  <ColumnOrderingSelectionModal ref="columnOrderingModal" />
</template>

<script setup>
import { parseQuery } from "@/components/genotype/lib";
import variantService from "@/services/variants";
import { useVariantsStore } from "@/stores/variants";
import { SemipolarSpinner } from "epic-spinners";
import { storeToRefs } from "pinia";
import { useColors } from "vuestic-ui";

const { colors } = useColors();
// const props = defineProps({})

const variantsStore = useVariantsStore();
const { currPage, pageSize } = storeToRefs(variantsStore);

const snapshot = ref(null);
const source = ref(null);
const query = ref(null);
const loading = ref(false);
const columnOrderingModal = ref(null);
const resultsView = ref(false);
const variants = ref([]);
const total_count = ref(0);
const participant_count = ref(0);

const example_searches = {
  gene: "GAB4",
  variant: "22-17477492-C-A", //"22-17311348-C-A"
  genomic_region: "chr22:17455700-17575000",
};

function reset() {
  console.log("reset");
  resultsView.value = false;
}

watchDebounced([query, currPage, pageSize], handleSearch, {
  deep: true,
  debounce: 150,
});

function handleSearch() {
  const parsedQuery = parseQuery(query.value);
  console.log("query changed", parsedQuery);
  // validate that parsedQuery is not empty
  if (Object.keys(parsedQuery).length === 0) {
    return;
  }
  loading.value = true;
  variantService
    .search({
      source_id: source.value,
      snapshot_id: snapshot.value,
      ranges: [parsedQuery],
      offset: (currPage.value - 1) * pageSize.value,
      limit: pageSize.value,
    })
    .then((res) => {
      console.log("total count", res);
      resultsView.value = true;
      variants.value = res.data?.variants || [];
      total_count.value = res.data?.metadata?.variant_count || 0;
      participant_count.value = res.data?.metadata?.participant_count || 0;
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>

<route lang="yaml">
meta:
  title: Variant Xplorer
  nav: [{ label: "Variant Xplorer" }]
</route>
