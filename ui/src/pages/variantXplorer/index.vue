<template>
  <VaInnerLoading :loading="resultsView && loading">
    <div class="flex flex-col gap-3">
      <!-- source, snapshot, searchParams forms, search button, reset button -->
      <VaCard>
        <VaCardContent>
          <div class="flex items-center gap-3">
            <SourceSelect v-model="cohort.query.source_id" class="flex-none" />
            <SnapshotSelect
              v-model="cohort.query.snapshot_id"
              class="flex-none"
            />
            <VariantSearchForm
              :search-params="cohort.query.ranges"
              :example_searches="EXAMPLE_SEARCHES"
              class="flex-grow"
              @add="addSearchParam"
              :replacement-param="replacementParam"
            />

            <VaButton
              @click="reset"
              size="small"
              color="danger"
              icon="backspace"
              outline
              preset="primary"
              class="ml-auto"
              v-if="cohort.query.ranges.length > 0"
            >
              Clear All
            </VaButton>
          </div>

          <!-- Selected variant search parameters -->
          <!-- adding epoch to replacementParam value to make each change/event unique -->
          <VariantSearchParameters
            class="mt-3"
            :search-params="cohort.query.ranges"
            @remove="removeSearchParam"
            @selectText="
              (text) => (replacementParam = `${new Date().getTime()}|${text}`)
            "
          />

          <!-- Zygosity selector and participant count + save as cohort button -->
          <div v-if="resultsView" class="mt-3">
            <VaDivider class="mt-4 mb-5" />
            <div class="flex flex-col md:flex-row gap-3">
              <div
                class="md:w-9/12 md:border-r md:border-solid md:border-gray-500 md:pr-3 min-w-[280px]"
              >
                <ZygositySelector v-model="cohort.query.zygosities" />
              </div>
              <va-divider class="md:hidden" />
              <div class="md:w-3/12">
                <div
                  class="flex flex-col flex-wrap items-center justify-center"
                >
                  <span class="text-lg">
                    <span
                      v-if="cohort.is_below_min_cohort_size"
                      class="mr-1 font-semibold"
                    >
                      <
                    </span>
                    <NumberTransition
                      :target="cohort.size"
                      :debounce="100"
                      :duration="30"
                      class="font-semibold"
                    />
                    {{ maybePluralize(cohort.size, "Participant", "s", false) }}
                  </span>

                  <VaButton
                    class="flex-none"
                    preset="secondary"
                    color="success"
                    :disabled="cohort.size === 0"
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
                  Genome Build: {{ config.cohort.genome_build }}
                </span>
              </p>
              <div class="ml-3">
                <VariantQueryBuilder
                  v-model:query="cohort.query.filters"
                  :locked="false"
                />
              </div>
            </div>

            <VaDivider class="my-3" />

            <!-- variant results table -->
            <div
              class="flex flex-wrap items-center justify-between w-full mb-3"
            >
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
        <div
          v-else
          class="flex-none tracking-wide max-w-3xl border border-solid border-gray-400 p-4 rounded-lg shadow-lg]"
        >
          <p class="mb-1">
            Enter a query in the search bar or get started with an example
            query:
          </p>
          <VariantSearchExample
            :example-searches="EXAMPLE_SEARCHES"
            @search="(val) => addSearchParam(parseQuery(val))"
          />

          <div class="mt-5">
            <p class="">
              You can also enter a comma-separated list of values, including any
              combination of genes, variants, or genomic regions.
            </p>
            <p class="mt-2">Examples:</p>
            <ul class="list-inside list-disc">
              <li>
                <button
                  class="va-link underline"
                  @click="
                    () =>
                      [
                        parseQuery(EXAMPLE_SEARCHES.gene),
                        parseQuery(EXAMPLE_SEARCHES.variant),
                        parseQuery(EXAMPLE_SEARCHES.genomic_region),
                      ].forEach(addSearchParam)
                  "
                >
                  {{ Object.values(EXAMPLE_SEARCHES).join(",&nbsp;&nbsp;") }}
                </button>
              </li>

              <li>
                <button
                  class="va-link underline"
                  @click="
                    () =>
                      EXAMPLE_GENES_LIST.map(parseQuery).forEach(addSearchParam)
                  "
                >
                  {{ EXAMPLE_GENES_LIST.join(",&nbsp;&nbsp;") }}
                </button>
              </li>
            </ul>
          </div>

          <div class="mt-7">
            <p>Search genomic regions in a BED file</p>
            <VaFileUpload
              dropzone
              file-types="text/plain, .bed"
              type="single"
              hideFileList
              @file-added="handleFileUpload"
            />
          </div>
        </div>
      </div>
    </div>
  </VaInnerLoading>
  <ColumnOrderingSelectionModal ref="columnOrderingModal" />
  <ColumnLegendModal ref="columnLegendModal" />
  <CohortSaveModal ref="saveCohortModal" :cohort="cohort" />
</template>

<script setup>
import { GenotypeCohort } from "@/components/cohorts/models";
import {
  EXAMPLE_GENES_LIST,
  EXAMPLE_SEARCHES,
  injectionKeys,
} from "@/components/genotype/constants";
import { parseBEDFile, parseQuery } from "@/components/genotype/lib";
import config from "@/config";
import cohortService from "@/services/cohorts2";
import genotypeService from "@/services/genotypes";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";
import { useVariantsStore } from "@/stores/variants";
import { SemipolarSpinner } from "epic-spinners";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { useColors } from "vuestic-ui";

const variantsStore = useVariantsStore();
const { currPage, pageSize } = storeToRefs(variantsStore);

const { colors } = useColors();
const number_formatter = Intl.NumberFormat("en");

const route = useRoute();

const columnOrderingModal = ref(null);
const columnLegendModal = ref(null);
const saveCohortModal = ref(null);

const loading = ref(false);
const resultsView = ref(false); // show results view only when search is done
const variant_count = ref(0);
const total_count = ref(0);
const cohort = ref(new GenotypeCohort());
const isInitializing = ref(false);
const replacementParam = ref(null);

const variants = ref([]);

provide(
  injectionKeys.ranges,
  computed(() => cohort.value.query.ranges),
);
provide(
  injectionKeys.snapshotId,
  computed(() => cohort.value.query.snapshot_id),
);
provide(
  injectionKeys.sourceId,
  computed(() => cohort.value.query.source_id),
);

// throttled fn runs at most once every 100ms
// it'll run on first call without delay and then ignores calls for 100ms
const searchVariants = useThrottleFn(function () {
  // console.log("searching variants");
  if (cohort.value.query.ranges.length === 0) {
    return;
  }
  loading.value = true;
  return genotypeService
    .search({
      offset: (currPage.value - 1) * pageSize.value,
      limit: pageSize.value,
      query: cohort.value.query,
    })
    .then((res) => {
      variants.value = res.data.variants;
      variant_count.value = res.data.metadata.total_count;
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to fetch variants");
    })
    .finally(() => {
      loading.value = false;
      resultsView.value = true;
    });
}, 500);

const searchParticipants = useThrottleFn(function () {
  // console.log("searching participants");
  if (cohort.value.isEmpty()) {
    cohort.value.size = 0;
    return Promise.resolve();
  }
  loading.value = true;
  return cohort.value
    .searchParticipants()
    .catch((err) => {
      console.error(err);
      toast.error("Failed to fetch participant count");
    })
    .finally(() => {
      loading.value = false;
    });
}, 500);

// when current page changes, fetch variants
watch(currPage, () => {
  searchVariants(); // throttled
});

watch(pageSize, () => {
  currPage.value = 1;
  searchVariants(); // throttled
});

// when zygosities change, fetch participants
watch(
  () => cohort.value.query.zygosities,
  searchParticipants, // throttled
  {
    deep: true,
  },
);

// when ranges change, reset filters, currPage and fetch both variants and participant count
watch(
  () => cohort.value.query.ranges,
  () => {
    // console.log("ranges changed", isInitializing.value);
    if (!isInitializing.value) {
      // console.log("resetting filters");
      cohort.value.query.filters = cohort.value.defaultQuery().filters;
      currPage.value = 1;
    }
    searchParticipants(); // throttled
    searchVariants(); // throttled
    if (cohort.value.query.ranges.length === 0) {
      // reset results view if no search ranges are present
      resultsView.value = false;
    }
  },
  {
    deep: true,
  },
);

// when filters change, fetch variants and participant count
watchDebounced(
  () => cohort.value.query.filters,
  () => {
    // console.log("filters changed");
    currPage.value = 1;
    searchParticipants(); // throttled
    searchVariants(); // throttled
  },
  { deep: true, debounce: 300 },
);

// when either of source or snapshot change, reset cohort query, results view, current page
watch(
  [() => cohort.value.query.source_id, () => cohort.value.query.snapshot_id],
  () => {
    // console.log("source or snapshot changed");
    resultsView.value = false;
    variants.value = [];
    variant_count.value = 0;
    total_count.value = 0;
    currPage.value = 1;
    pageSize.value = 50;

    // cohort.value.clearQuery() resets source and snapshot
    // to avoid resetting source and snapshot, we reset ranges, zygosities, filters
    const { ranges, zygosities, filters } = cohort.value.defaultQuery();
    cohort.value.query.ranges = ranges;
    cohort.value.query.zygosities = zygosities;
    cohort.value.query.filters = filters;
  },
);

function reset() {
  resultsView.value = false;
  variants.value = [];
  variant_count.value = 0;
  total_count.value = 0;
  currPage.value = 1;
  pageSize.value = 50;
  cohort.value.clearQuery();
}

function addSearchParam(param) {
  // add if not already present
  const existing = cohort.value.query.ranges.find((p) => _.isEqual(p, param));
  if (!existing) cohort.value.query.ranges.push(param);
}

function removeSearchParam(param) {
  const index = cohort.value.query.ranges.findIndex((p) => _.isEqual(p, param));
  if (index > -1) cohort.value.query.ranges.splice(index, 1);
}

// isInitializing - used to prevent resetting filters when cohort is being initialized
// vue batches updates, so we need to use nextTick to ensure that the flag is not unset
// in the current loop

async function loadCohortFromUrl() {
  try {
    isInitializing.value = true;
    const body = JSON.parse(route.query.body);
    cohort.value = new GenotypeCohort({
      query: body,
    });
    await nextTick();
  } catch (e) {
    console.error(e);
    toast.error("Failed to parse query");
  } finally {
    isInitializing.value = false;
  }
}

// as fetching cohort is async, we don't have to use nextTick
// since the finally block will be executed after the promise is resolved which is not in the current loop

function loadCohortFromId(cohort_id) {
  isInitializing.value = true;
  loading.value = true;
  return cohortService
    .getById(cohort_id)
    .then((res) => {
      if (res.data.query.schema.name !== "genotype") {
        toast.error("Cannot load cohorts of other types");
        return;
      }
      cohort.value = GenotypeCohort.fromApiData(res.data);
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to load cohort");
    })
    .finally(() => {
      loading.value = false;
      isInitializing.value = false;
    });
}

// load cohort from query params - id or body
onMounted(() => {
  if (route.query?.cohort_id) {
    loadCohortFromId(route.query.cohort_id);
  } else if (route.query?.body) {
    loadCohortFromUrl();
  }
});

function handleFileUpload(files) {
  // single file upload so only one file will be present
  return parseBEDFile(files[0])
    .then((regions) =>
      regions
        .slice(0, config.cohort.max_regions_bed_file) // limit to max regions
        .forEach(addSearchParam),
    )
    .catch((err) => {
      console.error(err);
      toast.error("Failed to parse BED file");
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
