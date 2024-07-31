<template>
  <div class="mt-3">
    <div class="flex items-center gap-3">
      <SourceSelect v-model="cohort.query.source_id" class="flex-none" />
      <VariantSearchForm
        :search-params="cohort.query.ranges"
        :example_searches="EXAMPLE_SEARCHES"
        @add="addSearchParam"
        class="flex-grow"
      />

      <!-- link to variant explorer -->
      <div>
        <RouterLink
          v-if="!cohort.isEmpty()"
          :to="{
            path: '/variantXplorer',
            query: cohort.hasUnsavedChanges()
              ? { body: JSON.stringify(cohort.query) }
              : { cohort_id: cohort.id },
          }"
          class="mt-3 font-normal va-link hover:underline"
        >
          Open in Variant Explorer
        </RouterLink>
      </div>
    </div>

    <VariantSearchParameters
      :search-params="cohort.query.ranges"
      @remove="removeSearchParam"
      class="mt-3"
    />

    <div v-if="cohort.query.ranges.length > 0">
      <VaDivider class="mt-3 mb-3" />
      <ZygositySelector v-model="cohort.query.zygosities" class="mt-3 pl-1" />
    </div>

    <div class="" v-if="cohort.query.ranges.length > 0">
      <VaDivider class="mt-3 mb-3" />
      <div class="flex gap-3 items-center font-semibold mb-3">
        <i-mdi-filter-variant />
        <span> Variant Filters </span>

        <span class="ml-auto font-normal">
          Genome Build: {{ config.cohort.genome_build }}
        </span>
      </div>
      <div class="ml-3">
        <VariantQueryBuilder
          v-model:query="cohort.query.filters"
          :locked="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { GenotypeCohort } from "@/components/cohorts/models";
import {
  EXAMPLE_SEARCHES,
  injectionKeys,
} from "@/components/genotype/constants";
import config from "@/config";
import _ from "lodash";

const cohort = defineModel("cohort", {
  type: GenotypeCohort,
  required: true,
});

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

function addSearchParam(param) {
  // add if not already present
  const existing = cohort.value.query.ranges.find((p) => _.isEqual(p, param));
  if (!existing) cohort.value.query.ranges.push(param);
}

function removeSearchParam(param) {
  const index = cohort.value.query.ranges.findIndex((p) => _.isEqual(p, param));
  if (index > -1) cohort.value.query.ranges.splice(index, 1);
}

// reset filters when ranges change
watch(
  () => cohort.value.query.ranges,
  () => {
    cohort.value.query.filters = cohort.value.defaultQuery().filters;
  },
  {
    deep: true,
  },
);
</script>
