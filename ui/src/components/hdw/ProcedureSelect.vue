<template>
  <div class="w-full">
    <!-- search bar -->
    <div class="mb-4 w-full">
      <va-input
        v-model="search_text"
        class="w-full"
        placeholder="Search procedures by name"
        outline
        clearable
        :messages="
          search_text.length > 0 && search_text.length < 3
            ? ['Please enter at least 3 characters']
            : []
        "
      >
        <template #prependInner>
          <Icon icon="material-symbols:search" class="text-xl" />
        </template>
      </va-input>
    </div>

    <!-- search results -->
    <div class="min-h-[28px]">
      <div v-if="results.length > 0" class="mb-4">
        <div class="text-sm font-medium mb-2 flex items-center justify-between">
          <va-checkbox
            label="Select All"
            :model-value="allResultsSelected"
            class="mx-2"
            @update:model-value="toggleAllResults"
            size="small"
          />
          <div>
            Search Results
            <span v-if="results.length > 0" class="ml-1">
              ({{ results.length }})
            </span>
          </div>
        </div>
        <div
          class="border border-solid border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto"
        >
          <div
            v-for="result in results"
            :key="result.code"
            class="p-1 hover:bg-gray-50 cursor-pointer flex items-center"
            @click="toggleSelection(result)"
            @keydown.enter="toggleSelection(result)"
            tabindex="0"
            role="button"
          >
            <va-checkbox
              :model-value="isSelected(result)"
              class="mr-2"
              @update:model-value="toggleSelection(result)"
            />
            <span class="text-sm">{{ result.name }} ({{ result.code }})</span>
          </div>
        </div>
      </div>
      <div v-if="no_matches" class="p-1 text-center va-text-secondary text-sm">
        No matches found
      </div>
    </div>

    <!-- selected procedures -->
    <div>
      <div class="text-sm font-medium mb-2 flex items-center justify-between">
        <span>Selected Procedures ({{ selectedList.length }})</span>
        <va-button
          v-if="selectedList.length > 0"
          preset="secondary"
          color="danger"
          size="small"
          icon="delete"
          @click="removeAllSelected"
        >
          Remove All
        </va-button>
      </div>
      <div
        class="border border-solid border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto pr-2"
        v-if="selectedList.length > 0"
      >
        <div
          v-for="item in selectedList"
          :key="item.code"
          class="p-1 flex items-center justify-between"
        >
          <span class="text-sm">{{ item.name }} ({{ item.code }})</span>
          <va-button
            preset="plain"
            color="danger"
            icon="close"
            class="text-gray-500 hover:text-gray-700"
            @click="removeSelection(item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import searchService from "@/services/hdw/search";

const selectedList = defineModel();

const search_text = ref("");
const loading = ref(false);
const results = ref([]);
const no_matches = ref(false);

const allResultsSelected = computed(() => {
  return (
    results.value.length > 0 &&
    results.value.every((result) => isSelected(result))
  );
});

function search() {
  loading.value = true;
  searchService
    .procedures(search_text.value)
    .then((res) => {
      results.value = res.data;
      if (results.value.length === 0) {
        no_matches.value = true;
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

function isSelected(item) {
  return selectedList.value.some((selected) => selected.code === item.code);
}

function toggleSelection(item) {
  const index = selectedList.value.findIndex(
    (selected) => selected.code === item.code,
  );
  if (index === -1) {
    selectedList.value.push(item);
  } else {
    selectedList.value.splice(index, 1);
  }
}

function toggleAllResults(value) {
  if (value) {
    // Add all unselected results
    results.value.forEach((result) => {
      if (!isSelected(result)) {
        selectedList.value.push(result);
      }
    });
  } else {
    // Remove all results that are in the search results
    selectedList.value = selectedList.value.filter(
      (selected) =>
        !results.value.some((result) => result.code === selected.code),
    );
  }
}

function removeSelection(item) {
  const index = selectedList.value.findIndex(
    (selected) => selected.code === item.code,
  );
  if (index !== -1) {
    selectedList.value.splice(index, 1);
  }
}

function removeAllSelected() {
  selectedList.value = [];
}

// search on input change with debounce
watchDebounced(
  search_text,
  () => {
    if (search_text.value && search_text.value.length >= 3) {
      search();
    } else {
      // clear search results when input is cleared or less than 3 characters
      results.value = [];
      no_matches.value = false;
    }
  },
  { debounce: 300 },
);
</script>

<style scoped></style>
