<template>
  <!-- search -->
  <va-form class="flex flex-wrap gap-3 items-start" ref="formRef">
    <va-input
      v-model="query"
      label="search"
      placeholder="Search by gene, variant, or genomic region"
      outline
      clearable
      inner-label
      @clear="resetFilters"
    >
      <template #prependInner>
        <Icon icon="material-symbols:search" class="text-xl" />
      </template>

      <template #appendInner>
        <VaPopover>
          <Icon icon="mdi:help-circle" class="text-base va-text-secondary" />
          <template #title>
            <i>Examples by query type:</i>
          </template>
          <template #body>
            <p>
              <span class="font-bold"> Gene </span> :
              {{ example_searches["gene"] }}
            </p>
            <p>
              <span class="font-bold"> Variant </span>:
              {{ example_searches["variant"] }}
            </p>
            <p>
              <span class="font-bold"> Genomic Region </span>:
              {{ example_searches["genomic_region"] }}
            </p>
          </template>
        </VaPopover>
      </template>
    </va-input>

    <va-select
      class="flex-none w-[180px]"
      v-model="source"
      :options="data_source_options"
      placeholder="Select a source"
      label="Data Source"
      searchable
      inner-label
      text-by="name"
      value-by="id"
      :highlight-matched-text="false"
    >
      <template #appendInner>
        <VaPopover message="todo">
          <Icon icon="mdi:help-circle" class="text-base va-text-secondary" />
        </VaPopover>
      </template>
    </va-select>

    <va-select
      class="flex-none w-[180px]"
      v-model="snapshot"
      :options="snapshot_options"
      placeholder="Select a snapshot"
      label="Snapshot"
      searchable
      inner-label
      :highlight-matched-text="false"
    >
      <template #appendInner>
        <VaPopover message="todo">
          <Icon icon="mdi:help-circle" class="text-base va-text-secondary" />
        </VaPopover>
      </template>
    </va-select>

    <va-button
      icon="search"
      class="flex-none w-[250px]"
      color="success"
      @click="handleSearch"
    >
      Search
    </va-button>
  </va-form>

  <!-- results and filter -->
  <div class="flex" v-if="resultsView">
    <!-- results -->
    <div class="w-10/12 p-3 border-r border-solid border-gray-500">
      <va-data-table
        :items="results"
        :columns="columns"
        :loading="loading"
        hoverable
        class="annotationtable"
      >
        <template #cell(chr)="{ rowData }">
          {{
            `${rowData.chr}-${rowData.position}-${rowData.ref}-${rowData.alt}`
          }}
        </template>

        <template #cell(allele_freq)="{ rowData }">
          {{ _.round(rowData.allele_count / rowData.allele_number, 6) }}
        </template>
      </va-data-table>

      <!-- pagination -->
      <va-pagination
        v-if="total_pages > 1"
        v-model="page"
        class="my-3 justify-center"
        :pages="total_pages"
        :visible-pages="5"
      />
      <!-- <div>
        <span>Results from {{  }} to {{  }} out of {{ total_count.value }}</span>
      </div> -->
    </div>

    <!-- sidebar -->
    <div class="w-2/12 p-3">
      <VaAccordion v-model="filterAccordian" class="max-w-sm" multiple>
        <!-- Genes Options -->
        <VaCollapse
          :header="filterLabels[idx]"
          v-for="(attr, idx) in filterKeys"
          :key="attr"
        >
          <template #content>
            <va-option-list
              v-model="filters[attr]"
              :options="
                Object.entries(filterGroups[attr]).map(([label, value]) => ({
                  label: `${label} (${value})`,
                  value: label,
                }))
              "
              text-by="label"
              value-by="value"
            />
          </template>
        </VaCollapse>

        <!-- clinvar significance Options -->
        <!-- <VaCollapse
          :header="`ClinVar Significance (${
            (filterGroups.cln_sig || []).length
          })`"
        >
          <template #content>
            <va-option-list
              v-model="filters.cln_sig"
              :options="
                filterGroups['cln_sig'].map((v) => `${v.cln_sig} (${v._count})`)
              "
            />
          </template>
        </VaCollapse> -->

        <!-- function Options -->
        <!-- <VaCollapse :header="`Function (${(filterGroups.func || []).length})`">
          <template #content>
            <va-option-list
              v-model="filters.func"
              :options="
                filterGroups['func'].map((v) => `${v.func} (${v._count})`)
              "
            />
          </template>
        </VaCollapse> -->

        <!-- exonic_func Options -->
        <!-- <VaCollapse
          :header="`Exonic Function (${
            (filterGroups.exonic_func || []).length
          })`"
        >
          <template #content>
            <va-option-list
              v-model="filters.exonic_func"
              :options="
                filterGroups['exonic_func'].map(
                  (v) => `${v.exonic_func} (${v._count})`,
                )
              "
            />
          </template>
        </VaCollapse> -->
      </VaAccordion>

      <!-- <div v-if="(filterGroups.genes || []).length > 0">
        <p class="capitalize font-semibold mb-2">Genes</p>
        <va-option-list
          v-model="filters.genes"
          :options="
            filterGroups['genes'].map((v) => `${v.genes} (${v._count})`)
          "
        />
      </div> -->

      <!-- <va-divider /> -->

      <!-- clinvar significance Options -->
      <!-- <div v-if="(filterGroups.cln_sig || []).length > 0">
        <p class="capitalize font-semibold mb-2">ClinVar Significance</p>
        <va-option-list
          v-model="filters.cln_sig"
          :options="
            filterGroups['cln_sig'].map((v) => `${v.cln_sig} (${v._count})`)
          "
        />
      </div> -->
    </div>
  </div>

  <!-- search examples -->
  <div class="flex justify-center items-center mt-24" v-else>
    <div class="flex-none text-lg">
      <p>
        Enter a query in the search bar or get started with an example query:
      </p>
      <p>
        <span class="font-bold"> Gene </span> :
        <span
          class="va-link underline"
          @click="
            query = example_searches['gene'];
            handleSearch();
          "
        >
          {{ example_searches["gene"] }}
        </span>
      </p>
      <p>
        <span class="font-bold"> Variant </span>:
        <span
          class="va-link underline"
          @click="
            query = example_searches['variant'];
            handleSearch();
          "
        >
          {{ example_searches["variant"] }}
        </span>
      </p>
      <p>
        <span class="font-bold"> Genomic Region </span>:
        <span
          class="va-link underline"
          @click="
            query = example_searches['genomic_region'];
            handleSearch();
          "
        >
          {{ example_searches["genomic_region"] }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import _ from "lodash";
import { useNavStore } from "@/stores/nav";
import snapshotsService from "@/services/snapshots";
import variantService from "@/services/variants";

const nav = useNavStore();
nav.setNavItems([
  {
    label: "Variant Xplorer",
  },
]);

const query = ref("");
const source = ref(2);
const snapshot = ref("");
const resultsView = ref(false);
const loading = ref(false);
const results = ref([]);
const total_count = ref(0);
const page = ref(1);
const filterGroups = ref({});
const filterKeys = ["genes", "cln_sig", "func", "exonic_func"];
const filterLabels = [
  "Genes",
  "ClinVar Significance",
  "Function",
  "Exonic Function",
];
const filters = ref({
  genes: [],
  cln_sig: [],
  func: [],
  exonic_func: [],
});
const filterAccordian = ref([true, false, false, false]);
watch(
  filters,
  () => {
    filterAccordian.value = Object.values(filters.value).map(
      (v, idx) => filterAccordian.value[idx] || v?.length || 0 > 0,
    );
  },
  { deep: true },
);

const PAGE_SIZE = 50;
const example_searches = {
  gene: "GAB4",
  variant: "22-17311348-C-A",
  genomic_region: "chr22:17455700-17575000",
};
const data_source_options = [
  { name: "Regeneron", id: 1 },
  { name: "Imputed", id: 2 },
];
const snapshot_options = ref([]);

const total_pages = computed(() => {
  return Math.ceil(total_count.value / PAGE_SIZE);
});

snapshotsService.getAll().then((res) => {
  snapshot_options.value = res.data.map((s) => s.name);
  snapshot.value = snapshot_options.value[0];
});

const columns = [
  { key: "chr", label: "Variant ID", width: "150px" },
  { key: "allele_number" },
  { key: "allele_count" },
  { key: "allele_freq" },
  { key: "func", label: "Function" },
  { key: "genes" },
  { key: "exonic_func", label: "Exonic Function" },
  { key: "aa_change", label: "Protien Change" },
  { key: "cln_sig", label: "ClinVar Significance" },
];

watch([page, filters], handleSearch, { deep: true });

function handleSearch() {
  const parsedQuery = parseQuery(query.value);

  // validate that parsedQuery is not empty
  if (Object.keys(parsedQuery).length === 0) {
    console.error("invalid query");
    return;
  }

  const skip = PAGE_SIZE * (page.value - 1);
  const query_opts = {
    ...parsedQuery,
    source_id: source.value,
    // snapshot: snapshot.value,
    ...filters.value,
  };
  console.log("searching", query_opts);

  loading.value = true;

  variantService
    .search({
      query: query_opts,
      offset: skip,
      limit: PAGE_SIZE,
    })
    .then((res) => {
      results.value = res.data?.results || [];
      total_count.value = res.data?.metadata?.count || 0;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
      resultsView.value = true;
    });

  variantService
    .getFilters({
      query: query_opts,
    })
    .then((res) => {
      filterGroups.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    });
}

function parseQuery(text) {
  /*
  Text can be in the following formats:

  Gene: BRCA2
  Variant: 13-32355250-T-C
  Genomic region: chr13:32355000-32375000

  If text starts with a number, assume it is a variant
  If text starts with chr, assume it is a genomic region
  Otherwise, assume it is a gene
  */

  const variantRegex = /^(\d+)-(\d+)-([A-Z])-([A-Z])$/;
  const genomicRegionRegex = /^chr(\d+):(\d+)-(\d+)$/;
  const geneRegex = /^([a-zA-Z0-9]+)$/;

  if (variantRegex.test(text)) {
    const match = text.match(variantRegex);
    return {
      chr: match[1],
      start: match[2],
      ref: match[3],
      alt: match[4],
    };
  } else if (genomicRegionRegex.test(text)) {
    const match = text.match(genomicRegionRegex);
    return {
      chr: match[1],
      start: match[2],
      end: match[3],
    };
  } else if (geneRegex.test(text)) {
    return {
      gene: text,
    };
  } else {
    return {};
  }
}

function resetFilters() {
  filters.value = {
    genes: null,
    cln_sig: null,
    func: null,
    exonic_func: null,
  };
  query.value = "";
  resultsView.value = false;
  filterAccordian.value = [true, false, false, false];
}
</script>

<style scoped>
.annotationtable {
  --va-data-table-cell-padding: 4px;
}
</style>
