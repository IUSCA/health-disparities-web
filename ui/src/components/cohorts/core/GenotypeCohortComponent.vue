<template>
  <div>
    <div class="flex items-center gap-3">
      <VariantSearchForm
        :search-params="cohort.query.ranges"
        :example_searches="EXAMPLE_SEARCHES"
        @add="addSearchParam"
        class="flex-grow"
      />
    </div>

    <VariantSearchParameters
      :search-params="cohort.query.ranges"
      @remove="removeSearchParam"
      class="mt-3"
    />

    <ZygositySelector v-model="cohort.query.zygosities" class="mt-3 pl-1" />

    <div class="mt-3">
      <p class="flex gap-1 items-center font-semibold mb-3">
        <i-mdi-filter-variant />
        <span> Variant Filters </span>
        <span class="ml-auto font-normal"> Genome Build: hg38 </span>
      </p>
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
</script>
