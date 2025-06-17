<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Health Disparities Analytics
      </h1>
      <p class="text-xl va-text-secondary">
        Uncovering and addressing healthcare inequities through data
      </p>
    </div>

    <!-- Main Cards Grid -->
    <div class="grid md:grid-cols-3 gap-8 mb-12">
      <!-- Cohorts Card -->
      <VaCard>
        <VaCardContent>
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              Cohorts
            </h2>
            <span
              class="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full"
              >{{ cohortCount }}</span
            >
          </div>
          <p class="va-text-secondary mb-4">
            Search through EHR data to create and manage patient groups based on
            specific criteria
          </p>
          <router-link
            to="/hdw/cohorts"
            class="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <span> Manage Cohorts </span>
            <i-mdi-chevron-right class="text-lg ml-2 mt-[0.125rem]" />
          </router-link>
        </VaCardContent>
      </VaCard>

      <!-- Interventions Card -->
      <VaCard>
        <VaCardContent>
          <div class="flex justify-between items-start mb-4">
            <h2
              class="text-2xl font-semibold text-green-600 dark:text-green-400"
            >
              Interventions
            </h2>
            <span
              class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm font-medium px-3 py-1 rounded-full"
              >{{ interventionCount }}</span
            >
          </div>
          <p class="va-text-secondary mb-4">
            Define and manage intervention conditions to analyze outcomes across
            patient cohorts
          </p>
          <router-link
            to="/hdw/interventions"
            class="flex items-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
          >
            <span> Manage Interventions </span>
            <i-mdi-chevron-right class="text-lg ml-2 mt-[0.125rem]" />
          </router-link>
        </VaCardContent>
      </VaCard>

      <!-- Analysis Card -->
      <VaCard>
        <VaCardContent>
          <div class="flex justify-between items-start mb-4">
            <h2
              class="text-2xl font-semibold text-purple-600 dark:text-purple-400"
            >
              Analysis
            </h2>
            <!-- <span
              class="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-sm font-medium px-3 py-1 rounded-full"
              >{{ analysisCount }}</span
            > -->
          </div>
          <p class="va-text-secondary mb-4">
            Examine health disparities across demographics including gender,
            race, and ethnicity
          </p>
          <router-link
            to="/hdw/analysis"
            class="flex items-center text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
          >
            <span> View Analysis </span>
            <i-mdi-chevron-right class="text-lg ml-2 mt-[0.125rem]" />
          </router-link>
        </VaCardContent>
      </VaCard>
    </div>

    <!-- Statistics Section -->
    <Statistics />
  </div>
</template>

<script setup>
import cohortsService from "@/services/hdw/cohorts";
import interventionsService from "@/services/hdw/interventions";

// Counters for each section
const cohortCount = ref(0);
const interventionCount = ref(0);
// const analysisCount = ref(0);

// System metrics
const metrics = ref({
  totalSubjects: 0,
  totalDiagnoses: 0,
  totalProcedures: 0,
  activeStudies: 0,
});

// Fetch data on component mount
onMounted(async () => {
  try {
    cohortsService.getAll().then((res) => {
      cohortCount.value = res.data.length;
    });
    interventionsService.getAll().then((res) => {
      interventionCount.value = res.data.length;
    });

    metrics.value = {
      totalSubjects: 25000,
      totalDiagnoses: 150000,
      totalProcedures: 75000,
      activeStudies: 5,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }
});
</script>

<style scoped>
.container {
  max-width: 1280px;
}
</style>

<route lang="yaml">
meta:
  title: Dashboard
  nav: []
</route>
