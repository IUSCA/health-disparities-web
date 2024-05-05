<template>
  <div class="flex flex-col gap-3">
    <VaCard>
      <VaCardContent>
        <div class="flex items-center gap-3">
          <SourceSelect v-model="source_id" class="flex-none" />
          <SnapshotSelect v-model="snapshot_id" class="flex-none" />
          <VariantSearchInput
            v-model="range_query"
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

    <div class="flex gap-3">
      <VaButton @click="() => columnOrderingModal.show()"> Columns </VaButton>
      <VaButton @click="() => columnLegendModal.show()"> Legend </VaButton>
    </div>

    <div class="">
      <VaCard class="cohort-card">
        <VaCardContent>
          <VariantQueryBuilder v-model:query="criteria" :locked="false" />
        </VaCardContent>
      </VaCard>
    </div>

    {{ criteria }}

    <div class="">
      <VaCard class="cohort-card">
        <VaCardContent>
          <ZygositySelector v-model="zygosities" />

          <p>Variants: {{ variant_count }}</p>

          <p>Participants: {{ participant_count }}</p>
        </VaCardContent>
      </VaCard>
    </div>

    <!-- results table -->
    <div v-if="resultsView">
      <VariantResultsTable
        :results="variants"
        :loading="loading"
        :total_count="variant_count"
      />
    </div>

    <!-- search examples -->
    <div class="flex flex-col justify-center items-center mt-24" v-else>
      <!-- loading spinner -->
      <div v-if="loading" class="flex justify-center items-center mt-24">
        <semipolar-spinner
          :animation-duration="2000"
          :size="65"
          :color="colors.primary"
        />
      </div>
      <VariantSearchExample
        v-else
        :example_searches="example_searches"
        @search="(val) => (range_query = val)"
      />
    </div>
  </div>

  <ColumnOrderingSelectionModal ref="columnOrderingModal" />
  <ColumnLegendModal ref="columnLegendModal" />
</template>

<script setup>
import {
isAPIQueryEmpty,
transformQueryForApi,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import { parseQuery } from "@/components/genotype/lib";
import variantService from "@/services/variants";
import { useVariantsStore } from "@/stores/variants";
import { SemipolarSpinner } from "epic-spinners";
import { storeToRefs } from "pinia";
import { useColors } from "vuestic-ui";

const { colors } = useColors();
// const props = defineProps({})

const variantsStore = useVariantsStore();
const { currPage, pageSize, source_id, snapshot_id, range } =
  storeToRefs(variantsStore);

const range_query = ref(null);
const criteria = ref(null);
const zygosities = ref(["HET", "HOMALT"]);
const loading = ref(false);

const columnOrderingModal = ref(null);
const columnLegendModal = ref(null);

const resultsView = ref(false);
const variants = ref([]);
const variant_count = ref(0);
const total_count = ref(0);
const participant_count = ref(0);

const canon_query = ref(transformQueryForApi(criteria.value));

// for every change in the query, transform it to the API query format (canonical query)
watchDebounced(
  criteria,
  (newQuery) => {
    canon_query.value = transformQueryForApi(newQuery);
  },
  {
    debounce: 300,
    deep: true,
  },
);

const example_searches = {
  gene: "GAB4",
  variant: "22-17477492-C-A", //"22-17311348-C-A"
  genomic_region: "chr22:17455700-17575000",
};

function reset() {
  console.log("reset");
  resultsView.value = false;
}

watchDebounced(
  range_query,
  (val) => {
    console.log("range_query", val);
    const parsedQuery = parseQuery(val);
    if (Object.keys(parsedQuery).length !== 0) {
      range.value = parsedQuery;
    }
  },
  {
    deep: true,
    debounce: 150,
  },
);

watch([range, currPage, pageSize, zygosities], handleSearch, {
  deep: true,
});

// watch for changes in the canonical query
// do not run on unsupported queries
// if the canonical query is empty, set the variants count to the total count
// deep compare old and new canonical queries to avoid unnecessary API calls
// if the query has changed, call the API
watch(
  canon_query,
  (newQuery, oldQuery) => {
    if (isAPIQueryEmpty(newQuery)) {
      variant_count.value = total_count.value;
      return;
    }
    if (JSON.stringify(oldQuery) !== JSON.stringify(newQuery)) {
      console.log("query changed", newQuery, oldQuery);

      handleSearch();
    }
  },
  { deep: true },
);

const EMPTY_CRITERIA = {
  operator: "AND",
  children: [],
};

function makeVariantSearchQuery() {
  return {
    query: {
      name: "genotype",
      namespace: "edu.iu.sca.biobank",
      version: "1.0.0",
      source_id: source_id.value,
      snapshot_id: snapshot_id.value,
      ranges: [range.value],
      zygosities: zygosities.value,
      criteria: canon_query.value || EMPTY_CRITERIA,
    },
    offset: (currPage.value - 1) * pageSize.value,
    limit: pageSize.value,
  };
}

function handleSearch() {
  console.log("handleSearch", range.value, currPage.value, pageSize.value);
  if (range.value == null || zygosities.value.length === 0) {
    return;
  }
  loading.value = true;
  variantService
    .search(makeVariantSearchQuery())
    .then((res) => {
      console.log("total count", res);
      resultsView.value = true;
      variants.value = res.data?.variants || [];
      variant_count.value = res.data?.metadata?.variant_count || 0;
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

<style scoped lang="scss">
.cohort-card {
  --va-card-padding: 0.75rem;
}
</style>
