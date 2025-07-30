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
    {{ tableSelectedItems }}
    {{ selectedInModal }}
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
            :messages="
              search_text.length > 0 && search_text.length < 3
                ? ['Please enter at least 3 characters']
                : []
            "
            @keydown.enter="search"
          >
            <template #prependInner>
              <Icon icon="material-symbols:search" class="text-xl" />
            </template>
          </va-input>
        </div>

        <!-- search button -->
        <VaButton
          preset="primary"
          :disabled="search_text.length < 3"
          class="ml-2"
          color="primary"
          @click="search"
          icon="search"
        >
          Search
        </VaButton>
      </div>

      <!-- search results -->
      <div class="text-sm">
        <!-- Initial state: no search text or no search performed yet -->
        <div v-if="!hasSearched" class="text-center py-8">
          <p class="va-text-secondary">
            Start typing to search for diagnoses...
          </p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8">
          <Icon
            icon="material-symbols:error-outline"
            class="text-4xl text-danger mb-2"
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

        <!-- Results table -->
        <VaDataTable
          v-else
          v-model="tableSelectedItems"
          class="dx-table"
          :loading="loading"
          :items="results"
          :no-data-text="no_matches ? 'No matches found' : ''"
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
        </VaDataTable>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <VaButton preset="secondary" color="secondary" @click="hide">
          Cancel
        </VaButton>
        <VaButton
          :disabled="tableSelectedItems.length === 0"
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
const props = defineProps({
  selectedList: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["select"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);

function hide() {
  visible.value = false;
  clearSearch();
}

function show() {
  visible.value = true;
  tableSelectedItems.value = (props.selectedList || []).map(
    (item) => item.code,
  );
  selectedInModal.value = [...(props.selectedList || [])];
}

const search_text = ref("");
const loading = ref(false);
const results = ref([]);
const no_matches = ref(false);
const error = ref(false);
const hasSearched = ref(false);
const tableSelectedItems = ref([]);
const selectedInModal = ref([]);

const sortBy = ref("participant_count");
const sortOrder = ref("desc");

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

function search() {
  loading.value = true;
  no_matches.value = false;
  error.value = false;
  hasSearched.value = true;
  searchService
    .dx(search_text.value)
    .then((res) => {
      results.value = res.data;
      if (results.value.length === 0) {
        no_matches.value = true;
      }
    })
    .catch(() => {
      error.value = true;
      results.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
}

function retry() {
  if (search_text.value && search_text.value.length >= 3) {
    search();
  }
}

// Clear results when search text is cleared
watch(search_text, (newValue) => {
  if (!newValue) {
    results.value = [];
    no_matches.value = false;
    error.value = false;
    hasSearched.value = false;
  }
});

function clearSearch() {
  search_text.value = "";
  results.value = [];
  error.value = false;
  no_matches.value = false;
  hasSearched.value = false;
  tableSelectedItems.value = [];
  selectedInModal.value = [];
}

function handleSelectionChange({
  currentSelectedItems,
  previousSelectedItems,
}) {
  // console.log({
  //   currentSelectedItems,
  //   previousSelectedItems,
  // });
  const currentSelectedSet = new Set(
    currentSelectedItems.filter((item) => item != null),
  );
  const previousSelectedSet = new Set(
    previousSelectedItems.filter((item) => item != null),
  );
  const addedCodes = difference(currentSelectedSet, previousSelectedSet);
  const removedCodes = difference(previousSelectedSet, currentSelectedSet);
  addedCodes.forEach((code) => {
    const item = results.value.find((item) => item.code === code);
    if (!item) return;
    if (selectedInModal.value.findIndex((i) => i.code === item.code) === -1) {
      selectedInModal.value.push(item);
    }
  });
  removedCodes.forEach((code) => {
    const index = selectedInModal.value.findIndex((item) => item.code === code);
    if (index !== -1) {
      selectedInModal.value.splice(index, 1);
    }
  });
}

function onSelectClick() {
  emit("select", selectedInModal.value);
  hide();
}

function handleRowClick({ item }) {
  const index = selectedInModal.value.findIndex((i) => i.code === item.code);
  if (index === -1) {
    selectedInModal.value.push(item);
  } else {
    selectedInModal.value.splice(index, 1);
  }

  const index2 = tableSelectedItems.value.findIndex(
    (code) => code === item.code,
  );
  if (index2 === -1) {
    tableSelectedItems.value.push(item.code);
  } else {
    tableSelectedItems.value.splice(index2, 1);
  }
}
</script>

<style scoped>
.dx-table {
  --va-data-table-cell-padding: 4px;
}
</style>
