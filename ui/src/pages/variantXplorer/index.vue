<template>
  <va-form class="flex flex-wrap gap-3 items-start min-h-[76px]" ref="formRef">
    <va-select
      class="flex-none"
      v-model="chromosome"
      :options="chromosome_options"
      placeholder="Select a chromosome"
      label="Chromosome"
      searchable
      :highlight-matched-text="false"
      :rules="[(v) => v || 'Field is required']"
    />
    <va-input
      v-model="start"
      label="Start Poisition"
      placeholder="ex: 44324727"
      :rules="[(v) => !!v || 'Field is required']"
    />
    <va-input v-model="end" label="End Poisition" placeholder="Optional" />
    <va-button
      icon="search"
      class="mt-[18px]"
      color="success"
      @click="handleSearch"
      :disabled="!isValid"
    >
      Search
    </va-button>
  </va-form>

  <va-divider v-if="results" />

  <div class="flex" v-if="results">
    <!-- Left Side (List of Rows) -->
    <div class="w-2/3 p-3 border-r border-solid border-gray-500">
      <va-data-table
        :items="results"
        :columns="columns"
        hoverable
        clickable
        @row:click="handleClick"
        :row-bind="getRowBind"
        virtual-scroller
        sticky-header
        style="height: calc(100vh - 15rem)"
        class="varianttable"
      >
        <template #cell(subjects)="{ source }">
          <span> {{ source.length }} </span>
        </template>

        <template #cell(export)="{}">
          <div class="flex gap-2">
            <va-button class="flex-initial" size="small" preset="primary">
              <i-mdi:export-variant />
            </va-button>
          </div>
        </template>
      </va-data-table>
    </div>

    <!-- Right Side (Sub Items of Selected Item) -->
    <div class="w-1/3 p-3">
      <div v-if="selectedItem">
        <div class="text-lg font-semibold text-center pb-1">
          Subjects with the selected variant
        </div>

        <ul style="height: calc(100vh - 16.5rem)" class="overflow-y-scroll">
          <li v-for="(subject, index) in selectedItem.subjects" :key="index">
            {{ subject }}
          </li>
        </ul>
      </div>
      <div v-else class="flex items-center h-full">
        <p class="text-center">Select a varaint to view its subjects.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useForm } from "vuestic-ui";

import { useNavStore } from "@/stores/nav";
import variantService from "@/services/variants";

const { isValid, validate } = useForm("formRef");

const nav = useNavStore();

const chromosome_options = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23,
];
const chromosome = ref(null);
const start = ref(null);
const end = ref(null);
const results = ref(null);
const loading = ref(false);
const selectedItem = ref(null);

const columns = [
  { key: "chromosome" },
  { key: "position", sortable: true },
  { key: "reference" },
  { key: "alternate" },
  { key: "genotype", sortable: true },
  { key: "subjects", sortable: true, sortingFn: (a, b) => a.length - b.length },
  { key: "export" },
];

nav.setNavItems([
  {
    label: "Variant Xplorer",
  },
]);

function handleSearch() {
  if (validate()) {
    loading.value = true;
    variantService
      .search({
        chromosome: chromosome.value,
        start: start.value,
        end: end.value,
      })
      .then((res) => {
        results.value = res.data;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        loading.value = false;
      });
  }
}

function handleClick({ item }) {
  selectedItem.value = item;
}

function eq(a, b) {
  if (!a || !b) return false;
  return (
    a.chromosome === b.chromosome &&
    a.position === b.position &&
    a.genotype === b.genotype
  );
}

function getRowBind(row) {
  if (eq(row, selectedItem.value)) {
    return {
      class: [
        "bg-blue-100 dark:bg-blue-800 border-blue-500 border-l-4 border-solid",
      ],
    };
  }
}
</script>

<style scoped>
.varianttable {
  --va-data-table-cell-padding: 6px;
}
</style>
