<template>
  <div>
    <!-- position search -->
    <va-form
      class="flex flex-wrap gap-3 items-start min-h-[76px]"
      ref="formRef"
    >
      <va-select
        class="flex-none w-[150px]"
        v-model="params.chr"
        :options="chromosome_options"
        placeholder="Select a chromosome"
        label="Chromosome"
        searchable
        :highlight-matched-text="false"
        :rules="[(v) => v || 'Field is required']"
      />
      <va-input
        v-model="params.start"
        label="Start Poisition"
        placeholder="ex: 44324727"
        class="w-[50px]"
        :rules="[(v) => !!v || 'Field is required']"
      />
      <va-input
        v-model="params.end"
        label="End Poisition"
        placeholder="Optional"
        class="w-[50px]"
      />
      <va-input
        v-model="params.ref"
        label="Reference"
        placeholder="Optional"
        class="w-[50px]"
      />
      <va-input
        v-model="params.alt"
        label="Alterate"
        placeholder="Optional"
        class="w-[50px]"
      />
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
    <!-- results and side bar -->
    <div class="flex">
      <!-- results -->
      <div class="w-10/12 p-3 border-r border-solid border-gray-500">
        <va-data-table
          :items="results"
          :columns="columns"
          hoverable
          virtual-scroller
          sticky-header
          style="height: calc(100vh - 15rem)"
          class="annotationtable"
        >
          <template #cell(chr)="{ rowData }">
            {{
              `${rowData.chr}-${rowData.position}-${rowData.ref}-${rowData.alt}`
            }}
          </template>
        </va-data-table>
      </div>
      <!-- sidebar -->
      <div class="w-2/12 p-3">
        <!-- Genes Options -->
        <div v-if="(filterGroups.genes || []).length > 0">
          <p class="capitalize font-semibold mb-2">Genes</p>
          <va-option-list
            v-model="params.genes"
            :options="
              filterGroups['genes'].map((v) => `${v.genes} (${v._count})`)
            "
          />
        </div>

        <va-divider />

        <!-- clinvar significance Options -->
        <div v-if="(filterGroups.cln_sig || []).length > 0">
          <p class="capitalize font-semibold mb-2">ClinVar Significance</p>
          <va-option-list
            v-model="params.cln_sig"
            :options="
              filterGroups['cln_sig'].map((v) => `${v.cln_sig} (${v._count})`)
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// TODO: pagination (remove virtual-scrolling?)
// TODO: sorting
// TODO: table fixed column widths
// TODO: table column content overflow
// TODO: sync params to url query
// TODO: sidebar fixed width

import { useForm } from "vuestic-ui";

import { useNavStore } from "@/stores/nav";
import variantService from "@/services/variants";

const { isValid, validate } = useForm("formRef");

const nav = useNavStore();
nav.setNavItems([
  {
    label: "Annotations",
  },
]);

// const props = defineProps({});
function defaultParams() {
  return {
    chr: 8,
    start: 6266641,
    end: 6272457,
    ref: null,
    alt: null,
    genes: [],
    cln_sig: [],
  };
}

const params = ref(defaultParams());
const results = ref([]);
const filterGroups = ref({});

const columns = [
  { key: "chr", label: "Variant ID" },
  { key: "func", label: "Function" },
  { key: "genes" },
  { key: "exonic_func", label: "Exonic Function" },
  { key: "aa_change", label: "Protien Change" },
  { key: "cln_sig", label: "ClinVar Significance" },
];
const chromosome_options = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  "XX",
  "XY",
];

function handleSearch() {
  if (validate()) {
    variantService
      .getAnnotations({
        query: params.value,
      })
      .then((res) => {
        results.value = res.data?.annotations || [];
      })
      .catch((err) => {
        console.error(err);
      });

    variantService
      .getAnnotationFilters({
        query: params.value,
      })
      .then((res) => {
        filterGroups.value = res.data;
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
</script>

<style scoped>
.annotationtable {
  --va-data-table-cell-padding: 6px;
}
</style>
