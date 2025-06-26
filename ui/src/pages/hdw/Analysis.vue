<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Selection Controls -->
    <div
      class="flex flex-wrap items-center gap-4 mb-4 w-full justify-start pt-4 pl-4"
    >
      <div class="min-w-[264px]">
        <SearchSelect
          label="Select Cohort"
          v-model="selectedCohort"
          :searchFunction="cohortsService.search"
          :loading="cohortLoading"
          searchPlaceholderText="Search by name or description..."
          placeholder="Select a cohort"
          icon="mdi-account-group"
        />
      </div>
      <div class="min-w-[264px]">
        <SearchSelect
          label="Select Intervention"
          v-model="selectedIntervention"
          :searchFunction="interventionsService.getAll"
          :loading="interventionLoading"
          searchPlaceholderText="Search by name or description..."
          placeholder="Select an intervention"
          icon="mdi-filter"
        />
      </div>
      <va-button
        class="flex-none px-6 h-full"
        :disabled="analyzing || !canAnalyze"
        :loading="analyzing"
        @click="analyze"
        icon="insights"
        size="large"
        color="success"
      >
        {{ analyzing ? "Analyzing..." : "Analyze Disparities" }}
      </va-button>
    </div>

    <!-- Analysis Results -->
    <div
      v-if="results"
      class="w-full flex-1 min-h-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 overflow-auto"
    >
      <div>
        <p class="text-lg font-semibold mb-2">Results</p>
      </div>
      <div class="flex gap-4 mb-5">
        <AnalysisResults
          :results="results.results"
          class="w-[320px] flex-none"
        />
        <AnalysisResultsVisualization
          :data="results.results.params"
          name="Coefficient"
          style="height: 340px; max-width: 600px; min-width: 340px"
        />
        <AnalysisResultsVisualization
          :data="results.results['p-values']"
          name="P-value"
          :color-idx="1"
          style="height: 340px; max-width: 600px; min-width: 340px"
        />
      </div>

      <div>
        <p class="text-lg font-semibold mb-2">Summary</p>
      </div>
      <div class="flex items-start gap-5">
        <AnalysisSummary :summary="results.summary" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!analyzing" class="flex-1 flex items-center justify-center">
      <div class="text-center text-gray-500">
        <div class="text-xl mb-2">No Analysis Results Yet</div>
        <p>Select a cohort and intervention, then click Analyze to begin</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import cohortsService from "@/services/cohorts2";
import analysisService from "@/services/hdw/analysis";
import interventionsService from "@/services/hdw/interventions";
// State
const selectedCohort = ref(null);
const selectedIntervention = ref(null);
const analyzing = ref(false);
const results = ref(null);
const cohortLoading = ref(false);
const interventionLoading = ref(false);

// Computed
const canAnalyze = computed(
  () => selectedCohort.value && selectedIntervention.value,
);

const analyze = async () => {
  if (!canAnalyze.value) return;

  analyzing.value = true;
  try {
    const res = await analysisService.logisticAnalysis({
      cohort_id: selectedCohort.value.id,
      intervention_id: selectedIntervention.value.id,
    });
    results.value = res.data;
  } catch (error) {
    console.error("Analysis error:", error);
  } finally {
    analyzing.value = false;
  }
};

watch([selectedCohort, selectedIntervention], () => {
  results.value = null;
});
</script>

<route lang="yaml">
meta:
  title: Disparity Analysis
  nav: [{ label: "Disparity Analysis" }]
</route>
