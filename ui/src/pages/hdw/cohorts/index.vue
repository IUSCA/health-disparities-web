<template>
  <div class="flex flex-col md:flex-row h-full overflow-hidden">
    <!-- Left Panel: Cohort List -->
    <div
      class="w-full md:w-5/12 lg:w-1/3 flex flex-col h-[50vh] md:h-full lg:max-w-[400px] md:pr-3 border-solid md:border-r border-gray-300 dark:border-gray-700"
    >
      <!-- Search and Create -->
      <div
        class="flex-none mb-4 flex flex-col sm:flex-row justify-between items-center gap-2 p-2 md:p-0"
      >
        <!-- search bar -->
        <div class="w-full sm:flex-1">
          <va-input
            v-model="searchQuery"
            class="w-full"
            placeholder="Search by name or description"
            outline
            clearable
          >
            <template #prependInner>
              <Icon icon="material-symbols:search" class="text-xl" />
            </template>
          </va-input>
        </div>

        <!-- Sort column dropdown -->
        <!-- <VaButtonDropdown preset="plain" class="mr-2 mb-2">
          <template #label>
            <i-mdi-sort-variant />
          </template>

          <div class="flex flex-col gap-2">
            <div>Name</div>
            <div>Created At</div>
          </div>
        </VaButtonDropdown> -->

        <!-- Create button -->
        <va-button
          @click="navigateToCreate"
          class="w-full sm:w-auto"
          color="success"
        >
          <i-mdi-plus />
          <span> Create </span>
        </va-button>
      </div>

      <!-- Cohorts -->
      <div class="flex-1 p-2 md:p-1 md:pr-3 space-y-2 overflow-y-auto min-h-0">
        <HDWCohortCard
          v-for="cohort in cohorts"
          :key="cohort.id"
          :cohort="cohort"
          @select="selectCohort"
          :isSelected="cohort.id === selectedCohort?.id"
        />

        <div
          v-if="cohorts.length === 0"
          class="flex items-center justify-center va-text-secondary"
        >
          No cohorts found
        </div>
      </div>
    </div>

    <!-- Right Panel: Cohort Details -->
    <div
      class="lg:flex-1 w-full md:w-7/12 lg:w-2/3 md:pl-3 h-[50vh] md:h-full overflow-y-auto p-2 md:p-0"
    >
      <div v-if="selectedCohort">
        <HDWCohortDetails :cohort="selectedCohort" />
      </div>

      <div
        v-else
        class="h-full flex items-center justify-center va-text-secondary"
      >
        Select a cohort to view details
      </div>
    </div>
  </div>
</template>

<script setup>
import cohortService from "@/services/hdw/cohorts";

const router = useRouter();
const searchQuery = ref("");
const selectedCohort = ref(null);

const cohorts = ref([]);

// Select cohort
const selectCohort = (cohort) => {
  selectedCohort.value = cohort;
};

// Navigate to create page
const navigateToCreate = () => {
  router.push("/cohorts/new");
};

// Fetch cohorts on mount
const fetchCohorts = async () => {
  cohortService
    .getAll({ search_query: searchQuery.value.trim() })
    .then((response) => {
      cohorts.value = response.data;
    })
    .catch((error) => {
      console.error(error);
    });
};

watchDebounced(
  searchQuery,
  () => {
    if (searchQuery.value) {
      selectedCohort.value = null;
      fetchCohorts();
    }
  },
  {
    debounce: 300,
  },
);

onMounted(() => {
  fetchCohorts();
});
</script>

<route lang="yaml">
meta:
  title: Cohorts
  nav: [{ label: "Cohorts" }]
</route>
