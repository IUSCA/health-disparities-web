<template>
  <!-- <div class="flex h-full items-center justify-center">
    <i-mdi-alert-circle-outline class="" />
    <span class="ml-2 va-text-secondary">
      Genomic variant cohort created with Variant Xplorer. (not editable)
    </span>
  </div> -->
  <div>
    <div class="flex items-center gap-3">
      <!-- <SourceSelect v-model="source" class="flex-none" /> -->

      <VariantSearchForm2
        v-model:search-params="cohort.criteria.ranges"
        :example_searches="EXAMPLE_SEARCHES"
        @add="addSearchParam"
        class="flex-grow"
      />

      <!-- <VaButton
        @click="reset"
        size="small"
        color="danger"
        icon="backspace"
        outline
        preset="primary"
        class="ml-auto"
        v-if="searchParams.length > 0"
      >
        Clear All
      </VaButton> -->
    </div>

    <VariantSearchParameters2
      v-model:search-params="cohort.criteria.ranges"
      @remove="removeSearchParam"
      class="mt-3"
    />

    <ZygositySelector v-model="cohort.criteria.zygosities" class="mt-3 pl-1" />

    <VaDivider class="mt-3" />

    <div class="mt-3">
      <p class="flex gap-1 items-center font-semibold mb-3">
        <i-mdi-filter-variant />
        <span> Variant Filters </span>
        <span class="ml-auto font-normal"> Genome Build: hg38 </span>
      </p>
      <div class="ml-3">
        <VariantQueryBuilder
          v-model:query="cohort.criteria.criteria"
          :locked="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  defaultQuery,
  transformQueryForApi,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import { EXAMPLE_SEARCHES } from "@/components/genotype/constants";
import variantService from "@/services/variants";
import { useCohortsStore } from "@/stores/cohorts";
import _ from "lodash";
import { storeToRefs } from "pinia";

const cohort = defineModel("cohort");

const cohortsStore = useCohortsStore();
const { cohorts } = storeToRefs(cohortsStore);

const emit = defineEmits(["beforeSearch", "afterSearch", "commit"]);
console.log("Genotype Cohort", cohort.value);

function addSearchParam(param) {
  // add if not already present
  const existing = cohort.value.criteria.ranges.find((p) =>
    _.isEqual(p, param),
  );
  if (!existing) cohort.value.criteria.ranges.push(param);
}

function removeSearchParam(param) {
  console.log("removeSearchParam", param);
  const index = cohort.value.criteria.ranges.findIndex((p) =>
    _.isEqual(p, param),
  );
  if (index > -1) cohort.value.criteria.ranges.splice(index, 1);
}

const canon_query = ref(transformQueryForApi(cohort.value.criteria.criteria));

// for every change in the query, transform it to the API query format (canonical query)
watchDebounced(
  () => cohort.value.criteria.criteria,
  (newQuery) => {
    canon_query.value = transformQueryForApi(newQuery);
  },
  {
    debounce: 300,
    deep: true,
  },
);

function makeVariantSearchQuery() {
  return {
    query: {
      name: "genotype",
      namespace: "edu.iu.sca.biobank",
      version: "1.0.0",
      source_id: 1,
      snapshot_id: 1,
      ranges: cohort.value.criteria.ranges.map((p) => _.omit(p, ["text"])),
      zygosities: cohort.value.criteria.zygosities,
      criteria: canon_query.value || transformQueryForApi(defaultQuery()),
    },
  };
}

function handleSearch() {
  if (
    cohort.value.criteria.ranges.length === 0 ||
    cohort.value.criteria.zygosities.length === 0
  ) {
    return;
  }
  emit("beforeSearch");
  variantService
    .search2(makeVariantSearchQuery())
    .then((res) => {
      cohort.value.size = res.data?.count;
      cohort.value.search_id = res.data.search_id;
      emit("afterSearch");
    })
    .catch((err) => {
      console.error(err);
      emit("afterSearch", err);
    });
}
const throttledSearch = useThrottleFn(handleSearch, 100);

// watch for changes in the search parameters and call the API
watch(
  [() => cohort.value.criteria.ranges, () => cohort.value.criteria.zygosities],
  () => {
    throttledSearch();
    emit("commit");
  },
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

      throttledSearch();
      emit("commit");
    }
  },
  { deep: true },
);

// when number of cohorts goes from 1 to 2, search and save results so that combine can be done
// needed only if cohort is dirty but query is not empty
watch(
  () => cohorts.value.length,
  (newVal, oldVal) => {
    if (
      newVal === 2 &&
      oldVal === 1 &&
      cohort.value.is_dirty &&
      !cohort.value.isEmpty()
    ) {
      throttledSearch();
    }
  },
);

// when a cohort component is mounted, if it is dirty with a non-empty query, search and save so that combine can be done
onMounted(() => {
  if (cohort.value.is_dirty && !cohort.value.isEmpty()) {
    throttledSearch();
  }
});
</script>
