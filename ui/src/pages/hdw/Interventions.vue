<template>
  <div class="flex flex-col md:flex-row h-full overflow-hidden">
    <!-- Left Panel -->
    <div
      class="w-full md:w-5/12 lg:w-1/3 flex flex-col h-[50vh] md:h-full lg:max-w-[400px] md:pr-3 border-solid md:border-r border-gray-300 dark:border-gray-700"
    >
      <!-- Search and Create -->
      <div
        class="flex-none mb-2 flex flex-col sm:flex-row justify-between items-center gap-2 p-2 md:p-0"
      >
        <!-- search bar -->
        <div class="w-full sm:flex-1">
          <va-input
            v-model="search_query"
            class="w-full"
            placeholder="Search by name"
            outline
            clearable
          >
            <template #prependInner>
              <Icon icon="material-symbols:search" class="text-xl" />
            </template>
          </va-input>
        </div>

        <!-- Create button -->
        <va-button
          @click="showModal = true"
          class="w-full sm:w-auto"
          color="success"
        >
          <i-mdi-plus />
          <span> Create </span>
        </va-button>
      </div>

      <!-- sort by and order -->
      <div class="mb-4 flex gap-2 pr-2">
        <va-select
          v-model="sortBy"
          :options="sortOptions"
          label="Sort by"
          class="w-1/2 text-sm"
          innerLabel
          text-by="label"
          value-by="value"
        />
        <va-select
          v-model="sortOrder"
          :options="orderOptions"
          label="Order"
          class="w-1/2 text-sm"
          innerLabel
          text-by="label"
          value-by="value"
        />
      </div>

      <!-- Interventions -->
      <div class="flex-1 p-2 md:p-1 md:pr-3 space-y-2 overflow-y-auto min-h-0">
        <InterventionCard
          v-for="intervention in interventions"
          :key="intervention.id"
          :intervention="intervention"
          @select="selectIntervention"
          :isSelected="intervention.id === selectedIntervention?.id"
        />

        <div
          v-if="interventions.length === 0"
          class="flex items-center justify-center va-text-secondary"
        >
          No interventions found
        </div>
      </div>
    </div>

    <!-- Right Panel: Details -->
    <div
      class="lg:flex-1 w-full md:w-7/12 lg:w-2/3 md:pl-3 h-[50vh] md:h-full overflow-y-auto p-2 md:p-0"
    >
      <div v-if="selectedIntervention">
        <InterventionDetails :id="selectedIntervention.id" />
      </div>
      <div
        class="h-full flex items-center justify-center va-text-secondary"
        v-else
      >
        Select an intervention to view details
      </div>
    </div>
  </div>

  <VaModal
    v-model="showModal"
    size="large"
    hide-default-actions
    close-button
    title="Create Intervention"
  >
    <InterventionForm
      @create="
        showModal = false;
        fetchInterventions();
      "
    />
  </VaModal>
</template>

<script setup>
import interventionService from "@/services/hdw/interventions";
// const props = defineProps({});

const interventions = ref([]);
const search_query = ref("");
const selectedIntervention = ref(null);
const showModal = ref(false);

const sortBy = ref("created_at");
const sortOrder = ref("desc");
const sortOptions = [
  { label: "Name", value: "name" },
  { label: "Created At", value: "created_at" },
];
const orderOptions = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
];

function selectIntervention(intervention) {
  selectedIntervention.value = intervention;
}

function fetchInterventions(search_query) {
  selectedIntervention.value = null;
  interventionService
    .getAll({
      search_query,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    })
    .then((response) => {
      interventions.value = response.data;
    })
    .catch((error) => {
      console.error(error);
    });
}

watchDebounced(
  search_query,
  () => {
    const x = search_query.value.trim();
    if (!x) {
      return;
    }
    fetchInterventions(x);
  },
  {
    debounce: 300,
  },
);

watch(
  [sortBy, sortOrder],
  () => {
    selectedIntervention.value = null;
    fetchInterventions(search_query.value.trim());
  },
  { immediate: true },
);

onMounted(() => {
  fetchInterventions();
});
</script>

<route lang="yaml">
meta:
  title: Interventions
  nav: [{ label: "Interventions" }]
</route>
