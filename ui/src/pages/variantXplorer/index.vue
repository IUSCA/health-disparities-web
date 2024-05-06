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
          <VaButton
            @click="reset"
            size="small"
            color="danger"
            icon="backspace"
            outline
            preset="primary"
            class="ml-auto"
            v-if="resultsView"
          >
            Clear All
          </VaButton>
        </div>

        <!-- Selected ranges -->
        <!-- <div>
          <div class="flex items-center gap-3">
            <div class="flex-none">Selected ranges:</div>
            <div class="flex-1"></div>
          </div>
        </div> -->

        <div v-if="resultsView" class="mt-3">
          <VaDivider class="mt-4 mb-5" />
          <div class="flex flex-col md:flex-row gap-3">
            <div
              class="md:w-9/12 md:border-r md:border-solid md:border-gray-500 md:pr-3 min-w-[280px]"
            >
              <ZygositySelector v-model="zygosities" />
            </div>
            <va-divider class="md:hidden" />
            <div class="md:w-3/12">
              <div class="flex flex-col flex-wrap items-center justify-center">
                <span class="text-lg">
                  <NumberTransition
                    :target="participant_count"
                    :debounce="100"
                    :duration="30"
                    class="mr-1 font-semibold"
                  />
                  {{
                    maybePluralize(participant_count, "Participant", "s", false)
                  }}
                </span>

                <VaButton
                  class="flex-none"
                  preset="secondary"
                  color="success"
                  :disabled="participant_count === 0"
                  @click="saveCohortModal.show()"
                >
                  <i-mdi-content-save-edit />
                  <span class="ml-1"> Save As Cohort </span>
                </VaButton>
              </div>
            </div>
          </div>
        </div>
      </VaCardContent>
    </VaCard>

    <!-- query builder, buttons and results table -->
    <div v-if="resultsView">
      <!-- query builder -->
      <VaCard class="cohort-card mb-3">
        <VaCardContent>
          <div class="">
            <p class="flex gap-1 items-center font-semibold mb-3">
              <i-mdi-filter-variant />
              <span> Variant Filters </span>
              <span class="ml-auto font-normal">
                Genome Build: {{ source_id === 1 ? "hg38" : "hg19" }}
              </span>
            </p>
            <div class="ml-3">
              <VariantQueryBuilder v-model:query="criteria" :locked="false" />
            </div>
          </div>

          <VaDivider class="my-3" />

          <!-- variant results table -->
          <div class="flex flex-wrap items-center justify-between w-full mb-3">
            <!-- variants counts -->
            <div class="space-x-1">
              <span> Filtering </span>
              <span class="font-semibold text-lg">
                <NumberTransition :target="variant_count" :debounce="50" />
              </span>
              <span v-if="total_count" class="text-lg">
                of {{ number_formatter.format(total_count) }}
              </span>
              <span class="">
                {{
                  maybePluralize(
                    total_count || variant_count,
                    "Variant",
                    "s",
                    false,
                  )
                }}
              </span>
            </div>

            <!-- buttons -->
            <div class="flex gap-3 items-center">
              <VaButton
                @click="() => columnOrderingModal.show()"
                preset="primary"
                border-color="primary"
                size="small"
              >
                <i-mdi-drag-variant />
                <span class="ml-1"> Columns </span>
              </VaButton>
              <VaButton
                @click="() => columnLegendModal.show()"
                preset="primary"
                border-color="primary"
                size="small"
              >
                <i-mdi-information-outline />
                <span class="ml-1"> Legend </span>
              </VaButton>
            </div>
          </div>

          <VariantResultsTable
            :results="variants"
            :loading="loading"
            :total_count="variant_count"
          />
        </VaCardContent>
      </VaCard>
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
  <GenotypeCohortSaveModal ref="saveCohortModal" @save="handleOnSave" />
</template>

<script setup>
import {
defaultQuery,
transformQueryForApi,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import { parseQuery } from "@/components/genotype/lib";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";
import variantService from "@/services/variants";
import { useVariantsStore } from "@/stores/variants";
import { SemipolarSpinner } from "epic-spinners";
import { storeToRefs } from "pinia";
import { useColors } from "vuestic-ui";

const { colors } = useColors();
// const props = defineProps({})
const number_formatter = Intl.NumberFormat("en");

const DEFAULT_ZYGOSITIES = ["HET", "HOMALT"];

const variantsStore = useVariantsStore();
const { currPage, pageSize, source_id, snapshot_id, range } =
  storeToRefs(variantsStore);

const range_query = ref(null);
const criteria = ref(null);
const zygosities = ref(DEFAULT_ZYGOSITIES);
const loading = ref(false);

const columnOrderingModal = ref(null);
const columnLegendModal = ref(null);
const saveCohortModal = ref(null);

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
  range_query.value = "";
  range.value = null;
  variants.value = [];
  variant_count.value = 0;
  total_count.value = 0;
  participant_count.value = 0;
  criteria.value = defaultQuery();
  zygosities.value = DEFAULT_ZYGOSITIES;
}

// convert range query (str) to range object
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

// get total count of variants when range changes
watch(
  [snapshot_id, source_id, range],
  () => {
    if (range.value == null) {
      return;
    }
    variantService
      .getTotalCount({
        source_id: source_id.value,
        snapshot_id: snapshot_id.value,
        ranges: [range.value],
      })
      .then((res) => {
        total_count.value = res.data?.count || 0;
      })
      .catch((err) => {
        console.error("Error getting total count", err);
      });
  },
  { deep: true },
);

// watch for changes in the search parameters and call the API
watch(
  [snapshot_id, source_id, range, currPage, pageSize, zygosities],
  handleSearch,
  {
    deep: true,
  },
);

// watch for changes in the canonical query
// do not run on unsupported queries
// if the canonical query is empty, set the variants count to the total count
// deep compare old and new canonical queries to avoid unnecessary API calls
// if the query has changed, call the API
watch(
  canon_query,
  (newQuery, oldQuery) => {
    // if (isAPIQueryEmpty(newQuery)) {
    //   variant_count.value = total_count.value;
    //   return;
    // }
    if (JSON.stringify(oldQuery) !== JSON.stringify(newQuery)) {
      console.log("query changed", newQuery, oldQuery);

      handleSearch();
    }
  },
  { deep: true },
);

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
      criteria: canon_query.value || transformQueryForApi(defaultQuery()),
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
      resultsView.value = true;
      variants.value = res.data?.variants || [];
      variant_count.value = res.data?.metadata?.variant_count || 0;
      participant_count.value = res.data?.metadata?.participant_count || 0;
    })
    .finally(() => {
      loading.value = false;
    });
}

const cohort_id = ref(null);
function handleOnSave(cohort_data) {
  const isNewCohort = !cohort_id.value;
  const req_body = {
    ...cohort_data,
    query: makeVariantSearchQuery().query,
  };
  if (isNewCohort) {
    variantService
      .createCohort(req_body)
      .then((res) => {
        cohort_id.value = res.data.id;
        toast.success("Cohort saved successfully");
        saveCohortModal.value.hide();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error saving cohort");
      });
  } else {
    variantService
      .updateCohort(cohort_id.value, req_body)
      .then(() => {
        toast.success("Cohort updated successfully");
        saveCohortModal.value.hide();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error updating cohort");
      });
  }
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
