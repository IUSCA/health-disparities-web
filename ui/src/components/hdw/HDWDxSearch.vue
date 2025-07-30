<template>
  <VaModal
    v-model="visible"
    title="Search Diagnoses"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    no-esc-dismiss
    size="large"
  >
    <div class="w-full">
      <!-- search bar -->
      <div class="w-full flex items-start">
        <div class="w-full h-[56px]">
          <va-input
            v-model="search_text"
            class="w-full"
            placeholder="Search diagnoses by name"
            outline
            clearable
            :messages="searchValidationMessages"
            @keydown.enter="handleSearchKeydown"
          >
            <template #prependInner>
              <Icon icon="material-symbols:search" class="text-xl" />
            </template>
          </va-input>
        </div>

        <!-- search button -->
        <VaButton
          preset="primary"
          :disabled="!isSearchValid || loading"
          class="ml-2"
          color="primary"
          @click="search"
          icon="search"
        >
          Search
        </VaButton>
      </div>

      <!-- search results -->
      <div class="text-sm min-h-[160px]">
        <!-- Initial state: no search text or no search performed yet -->
        <div v-if="!hasSearched" class="text-center py-8">
          <Icon
            icon="material-symbols:search"
            class="text-4xl va-text-secondary mb-2 inline-block"
          />
          <p class="va-text-secondary">
            Enter at least 3 characters to search for diagnoses...
          </p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8">
          <Icon
            icon="material-symbols:error-outline"
            class="text-4xl text-danger mb-2 inline-block"
          />
          <p class="va-text-primary mb-3">
            Something went wrong while searching
          </p>
          <div class="flex gap-2 justify-center">
            <va-button preset="secondary" icon="refresh" @click="retry">
              Retry
            </va-button>
            <va-button
              preset="secondary"
              color="secondary"
              icon="clear"
              @click="clearSearch"
            >
              Clear
            </va-button>
          </div>
        </div>

        <!-- No results state -->
        <div v-else-if="no_matches" class="text-center py-8">
          <Icon
            icon="material-symbols:search-off"
            class="text-4xl va-text-secondary mb-2 inline-block"
          />
          <p class="va-text-primary mb-3">
            No diagnoses found for "{{ search_text }}"
          </p>
          <p class="va-text-secondary text-sm">
            Try searching with different keywords or check your spelling
          </p>
        </div>

        <!-- Results table -->
        <VaDataTable
          v-else-if="results.length > 0"
          v-model="tableSelectedItems"
          class="dx-table"
          :loading="loading"
          :items="results"
          :columns="columns"
          selectable
          select-mode="multiple"
          items-track-by="code"
          @selection-change="handleSelectionChange"
          clickable
          @row:click="handleRowClick"
          virtual-scroller
          sticky-header
          style="height: 400px"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          :animated="false"
        >
          <template #cell(participant_count)="{ value }">
            {{ formatNumber(value) }}
          </template>
        </VaDataTable>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <VaButton preset="secondary" color="secondary" @click="hide">
          Cancel
        </VaButton>
        <VaButton
          :disabled="selectedInModal.length === 0"
          color="success"
          @click="onSelectClick"
          icon="check"
        >
          Select
        </VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup>
import searchService from "@/services/hdw/search";
import { difference } from "@/services/utils";
import { computed, ref, watch } from "vue";

// Constants
const MIN_SEARCH_LENGTH = 3;

const props = defineProps({
  selectedList: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["select"]);

// Expose methods to parent component
defineExpose({
  show,
  hide,
});

// Reactive state
const visible = ref(false);
const search_text = ref("");
const loading = ref(false);
const results = ref([]);
const error = ref(false);
const hasSearched = ref(false);
const tableSelectedItems = ref([]);
const selectedInModal = ref([]);
const sortBy = ref("participant_count");
const sortOrder = ref("desc");

// Computed properties
const isSearchValid = computed(
  () => search_text.value.length >= MIN_SEARCH_LENGTH,
);

const searchValidationMessages = computed(() => {
  if (
    search_text.value.length > 0 &&
    search_text.value.length < MIN_SEARCH_LENGTH
  ) {
    return [`Please enter at least ${MIN_SEARCH_LENGTH} characters`];
  }
  return [];
});

const no_matches = computed(
  () =>
    hasSearched.value &&
    results.value.length === 0 &&
    !loading.value &&
    !error.value,
);

// Table columns configuration
const columns = [
  { key: "name", label: "Name", tdClass: "truncate", width: "440px" },
  {
    key: "code",
    label: "Code",
    tdClass: "truncate",
    width: "90px",
    sortable: true,
  },
  {
    key: "code_system",
    label: "Code System",
    tdClass: "truncate",
    width: "120px",
  },
  {
    key: "participant_count",
    label: "Participant Count",
    tdClass: "truncate",
    width: "100px",
    sortable: true,
  },
];

// Modal methods
function show() {
  visible.value = true;
  initializeModalState();
}

function hide() {
  visible.value = false;
  resetModalState();
}

function initializeModalState() {
  const selectedCodes = (props.selectedList || []).map((item) => item.code);
  tableSelectedItems.value = [...selectedCodes];
  selectedInModal.value = [...(props.selectedList || [])];
}

function resetModalState() {
  search_text.value = "";
  results.value = [];
  error.value = false;
  hasSearched.value = false;
  tableSelectedItems.value = [];
  selectedInModal.value = [];
}

// Search methods
function search() {
  if (!isSearchValid.value || search_text.value.length < MIN_SEARCH_LENGTH)
    return;

  loading.value = true;
  error.value = false;
  hasSearched.value = true;

  searchService
    .dx(search_text.value)
    .then((res) => {
      results.value = res.data || [];
    })
    .catch((err) => {
      console.error("Search failed:", err);
      error.value = true;
      results.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleSearchKeydown() {
  if (!loading.value) search();
}

function retry() {
  search();
}

function clearSearch() {
  resetModalState();
}

// Utility methods
function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

// Selection handling
function handleSelectionChange({
  currentSelectedItems,
  previousSelectedItems,
}) {
  const currentSelectedSet = new Set(currentSelectedItems.filter(Boolean));
  const previousSelectedSet = new Set(previousSelectedItems.filter(Boolean));

  const addedCodes = difference(currentSelectedSet, previousSelectedSet);
  const removedCodes = difference(previousSelectedSet, currentSelectedSet);

  // Add newly selected items
  addedCodes.forEach((code) => {
    const item = results.value.find((item) => item.code === code);
    if (item && !selectedInModal.value.some((i) => i.code === item.code)) {
      selectedInModal.value.push(item);
    }
  });

  // Remove deselected items
  removedCodes.forEach((code) => {
    const index = selectedInModal.value.findIndex((item) => item.code === code);
    if (index !== -1) {
      selectedInModal.value.splice(index, 1);
    }
  });
}

function handleRowClick({ item }) {
  const existingIndex = selectedInModal.value.findIndex(
    (i) => i.code === item.code,
  );
  const tableIndex = tableSelectedItems.value.findIndex(
    (code) => code === item.code,
  );

  if (existingIndex === -1) {
    selectedInModal.value.push(item);
  } else {
    selectedInModal.value.splice(existingIndex, 1);
  }

  if (tableIndex === -1) {
    tableSelectedItems.value.push(item.code);
  } else {
    tableSelectedItems.value.splice(tableIndex, 1);
  }
}

function onSelectClick() {
  emit("select", [...selectedInModal.value]);
  hide();
}

// Watchers
watch(search_text, (newValue) => {
  if (!newValue) {
    results.value = [];
    error.value = false;
    hasSearched.value = false;
  }
});
</script>

<style scoped>
.dx-table {
  --va-data-table-cell-padding: 4px;
}

/* Enhanced table styling for better readability */
:deep(.va-data-table) {
  overflow: hidden;
}
</style>
