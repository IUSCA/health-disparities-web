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
          :searchFunction="cohortsService.getAll"
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
        <p class="text-lg font-semibold mb-2">Summary</p>
      </div>
      <div class="flex items-start gap-5 mb-5">
        <AnalysisSummary :summary="results.summary" />
      </div>

      <div class="flex items-center justify-between mb-2">
        <p class="text-lg font-semibold">Results</p>
        <va-button-group>
          <va-button
            :preset="showTable ? 'primary' : 'secondary'"
            @click="showTable = true"
            icon="table_chart"
            size="small"
          >
            Table
          </va-button>
          <va-button
            :preset="!showTable ? 'primary' : 'secondary'"
            @click="showTable = false"
            icon="bar_chart"
            size="small"
          >
            Visualizations
          </va-button>
        </va-button-group>
      </div>

      <!-- Statistical Help Text -->
      <div
        class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
      >
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <div class="font-medium mb-2">Understanding the Results:</div>
          <div class="space-y-1">
            <div>
              <strong>P-values:</strong> P-values less than 0.05 are considered
              statistically significant, indicating a reliable association with
              the outcome.
            </div>
            <div>
              <strong>Coefficients:</strong> Each value shows how a factor
              affects the likelihood of the outcome. A positive number means
              that higher values of that factor make the outcome more likely. A
              negative number means the factor makes the outcome less likely.
              Larger numbers (in either direction) indicate a stronger effect.
            </div>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-if="showTable" class="flex gap-4 mb-2">
        <AnalysisResults :results="results.results" class="w-full" />
      </div>

      <!-- Visualization View -->
      <div v-else class="flex gap-4 mb-2">
        <AnalysisResultsVisualization
          :data="results.results.params"
          name="Coefficient"
          title="Coefficients"
          style="height: 340px; max-width: 600px; min-width: 340px"
        />
        <AnalysisResultsVisualization
          :data="results.results['p-values']"
          name="P-value"
          title="P-values"
          :color-idx="1"
          style="height: 340px; max-width: 600px; min-width: 340px"
        />
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
import analysisService from "@/services/hdw/analysis";
import cohortsService from "@/services/hdw/cohorts";
import interventionsService from "@/services/hdw/interventions";
// State
const selectedCohort = ref(null);
const selectedIntervention = ref(null);
const analyzing = ref(false);
const results = ref(null);
const cohortLoading = ref(false);
const interventionLoading = ref(false);
const showTable = ref(true);

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
