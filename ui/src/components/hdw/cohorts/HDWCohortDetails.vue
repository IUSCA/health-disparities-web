<template>
  <div class="flex flex-col gap-4 lg:gap-7">
    <div class="flex gap-4 flex-wrap h-[200px]">
      <!-- <div class="flex-1">
        <HDWQueryDisplay :query="props.cohort.query" />
      </div> -->
      <div class="w-1/2 ml-auto">
        <HDWCohortSummary
          :summary="summary"
          v-if="!summary_loading && summary"
        />
        <div
          v-else-if="!summary_loading"
          class="flex flex-col items-center justify-center h-full"
        >
          <div class="flex items-center justify-center gap-2 va-text-secondary">
            <i-mdi-information-outline class="text-2xl" />
            <span>Unable to load summary</span>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-full">
          <div class="flex items-center justify-center gap-2 va-text-secondary">
            <i-mdi-loading class="animate-spin text-2xl" />
            <span>Loading summary</span>
          </div>
        </div>
      </div>
    </div>

    <div class="h-[320px]">
      <CohortEncounterPercentiles
        :data="encounter_percentiles"
        v-if="!encounter_percentiles_loading && encounter_percentiles"
      />
      <div
        v-else-if="!encounter_percentiles_loading"
        class="flex items-center justify-center h-full"
      >
        <div class="flex items-center justify-center gap-2 va-text-secondary">
          <i-mdi-information-outline class="text-2xl" />
          <span>Unable to load encounter percentiles</span>
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full">
        <div class="flex items-center justify-center gap-2 va-text-secondary">
          <i-mdi-loading class="animate-spin text-2xl" />
          <span>Loading encounter percentiles</span>
        </div>
      </div>
    </div>

    <div class="h-[320px]">
      <CohortEncounterHistograms
        :data="encounter_bins"
        v-if="!encounter_bins_loading && encounter_bins"
      />
      <div
        v-else-if="!encounter_bins_loading"
        class="flex items-center justify-center h-full"
      >
        <div class="flex items-center justify-center gap-2 va-text-secondary">
          <i-mdi-information-outline class="text-2xl" />
          <span>Unable to load encounter histograms</span>
        </div>
      </div>

      <div v-else class="flex items-center justify-center h-full">
        <div class="flex items-center justify-center gap-2 va-text-secondary">
          <i-mdi-loading class="animate-spin text-2xl" />
          <span>Loading encounter histograms</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import cohortService from "@/services/hdw/cohorts";
const props = defineProps({
  cohortId: {
    type: String,
    required: true,
  },
});
const summary = ref(null);
const summary_loading = ref(false);

const encounter_percentiles = ref(null);
const encounter_percentiles_loading = ref(false);

const encounter_bins = ref(null);
const encounter_bins_loading = ref(false);

watch(
  () => props.cohortId,
  () => {
    console.log("props.cohortId", props.cohortId);
    const id = props.cohortId;
    if (id) {
      summary_loading.value = true;
      encounter_percentiles_loading.value = true;
      encounter_bins_loading.value = true;

      // fetch summary
      cohortService
        .getSummary(id)
        .then((res) => {
          summary.value = res.data;
        })
        .catch((err) => {
          console.error(err);
          summary.value = null;
        })
        .finally(() => {
          summary_loading.value = false;
        });

      // fetch encounter percentiles
      cohortService
        .getEncounterPercentiles(id)
        .then((res) => {
          encounter_percentiles.value = res.data;
        })
        .catch((err) => {
          console.error(err);
          encounter_percentiles.value = null;
        })
        .finally(() => {
          encounter_percentiles_loading.value = false;
        });

      // fetch encounter bins
      cohortService
        .getEncounterBins(id)
        .then((res) => {
          encounter_bins.value = res.data;
        })
        .catch((err) => {
          console.error(err);
          encounter_bins.value = null;
        })
        .finally(() => {
          encounter_bins_loading.value = false;
        });
    }
  },
  {
    immediate: true,
    deep: true,
  },
);
</script>
