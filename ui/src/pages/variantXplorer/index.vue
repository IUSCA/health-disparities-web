<template>
  <!-- search -->
  <va-form class="flex flex-wrap gap-3 items-start" ref="formRef">
    <!-- variant search input -->
    <va-input
      v-model="query"
      label="search"
      placeholder="Search by gene, variant, or genomic region"
      outline
      clearable
      inner-label
      @clear="reset"
      @keypress.enter="handleSearch"
      class="flex-1"
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

    <!-- source select -->
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

    <!-- snapshot select -->
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

    <!-- search button -->
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
  <div class="flex pt-3" v-if="resultsView">
    <!-- results -->
    <div class="w-10/12 border-r border-solid border-gray-500">
      <!-- table top buttons -->
      <div class="mb-2 px-5 flex items-center gap-5 justify-end">
        <div class="">
          <span class="text-xl font-bold va-text-info">
            <NumberTransition :target="total_count" />
            {{ maybePluralize(total_count, "Variant", "s", false) }}
          </span>
        </div>

        <va-button
          @click="columnsModal = true"
          class="flex-none"
          preset="secondary"
        >
          <i-mdi-drag-variant class="mr-1" />
          Columns
        </va-button>
        <!-- <va-button class="flex-none" preset="primary">
          Selected ({{ selected.length }})
        </va-button> -->
      </div>

      <!-- table -->
      <va-data-table
        :items="results"
        :columns="table_columns"
        :loading="loading"
        hoverable
        @selectionChange="handleSelectionChange"
        class="annotationtable"
      >
        <template #cell(chr)="{ rowData }">
          {{
            `${rowData.chr}-${rowData.position}-${rowData.ref}-${rowData.alt}`
          }}
        </template>

        <template #cell(allele_freq)="{ rowData }">
          {{
            _.round(
              rowData.allele_count / rowData.allele_number,
              NUMERIC_PRECISION,
            )
          }}
        </template>
      </va-data-table>

      <!-- pagination -->
      <Pagination
        class="px-1 lg:px-3 mt-3"
        v-model:page="currPage"
        v-model:page_size="pageSize"
        :total_results="total_count"
        :curr_items="results.length"
        :page_size_options="PAGE_SIZE_OPTIONS"
      />
    </div>

    <!-- sidebar -->
    <div class="w-2/12 pl-3">
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

        <!-- Numeric Filters -->
        <VaCollapse
          :header="numericFilterLabels[idx]"
          v-for="(attr, idx) in numericFilterKeys"
          :key="attr"
        >
          <template #content>
            <div class="flex flex-col gap-2">
              <va-input
                v-model="numericFilters[attr]['min']"
                placeholder="min"
                class="flex-1"
                :rules="[
                  (v) => !isNaN(parseFloat(v || 1)) || 'Must be a number',
                ]"
              />
              <va-input
                v-model="numericFilters[attr]['max']"
                placeholder="max"
                class="flex-1"
                :rules="[
                  (v) => !isNaN(parseFloat(v || 1)) || 'Must be a number',
                ]"
              />
            </div>
          </template>
        </VaCollapse>
      </VaAccordion>
    </div>
  </div>

  <!-- search examples -->
  <div class="flex flex-col justify-center items-center mt-24" v-else>
    <!-- No results found message -->
    <div
      v-if="total_count == 0 && !loading && searchPerformed"
      class="flex flex-col justify-center items-center text-center"
    >
      <i-mdi-magnify class="text-6xl text-red-500" />
      <p class="text-2xl tracking-wide font-semibold">No Results Found</p>
      <p class="va-text-secondary">
        <span @click="reset" class="underline cursor-pointer">
          Try a different search query or reset your filter selections
        </span>
      </p>
    </div>

    <div v-else>
      <!-- loading spinner -->
      <div v-if="loading" class="flex justify-center items-center mt-24">
        <semipolar-spinner
          :animation-duration="2000"
          :size="65"
          :color="colors.primary"
        />
      </div>

      <!-- search examples -->
      <div class="flex-none text-lg" v-else>
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
  </div>

  <!-- columns selection and ordering modal -->
  <va-modal
    v-model="columnsModal"
    close-button
    hide-default-actions
    size="large"
  >
    <div>
      <span class="font-semibold text-lg">
        Drag &amp; Drop to rearrange columns
      </span>
      <Ordering
        v-model="table_columns"
        id-by="key"
        label-by="label"
        class="border border-solid rounded border-gray-400 mt-2"
      />
      <div class="mt-3">
        <div class="flex flex-row gap-2">
          <div
            v-for="cat in Object.keys(colums_by_category)"
            :key="cat"
            class="flex-auto"
          >
            <span class="font-semibold tracking-wide text-lg"> {{ cat }} </span>
            <div class="flex flex-col gap-1 mt-2">
              <div v-for="col in colums_by_category[cat]" :key="col.key">
                <va-checkbox
                  v-model="columnsSelected[col.key]"
                  :label="col.label"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column Legend -->
      <div class="gap-2 mt-2">
        <va-data-table
          :items="Object.values(columns)"
          :columns="[
            { key: 'label', label: 'Name', sortable: true },
            { key: 'thTitle', label: 'Description', sortable: true },
            { key: 'category', label: 'Category', sortable: true },
          ]"
          striped
          style="height: 200px; overflow-y: scroll"
          class="annotationtable"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-start w-full">
        <va-button
          preset="primary"
          @click="restoreColumnDefaults"
          class="flex-none"
        >
          Restore Defaults
        </va-button>
      </div>
    </template>
  </va-modal>
</template>

<script setup>
import snapshotsService from "@/services/snapshots";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";
import variantService from "@/services/variants";
import { useUIStore } from "@/stores/ui";
import { SemipolarSpinner } from "epic-spinners";
import _ from "lodash";
import { useColors } from "vuestic-ui";

const ui = useUIStore();
const { colors } = useColors();

const NUMERIC_PRECISION = 3;

const query = ref("");
const source = ref(1);
const snapshot = ref("");
const resultsView = ref(false);
const loading = ref(false);
const searchPerformed = ref(false);

const results = ref([]);
const total_count = ref(0);
function resetResults() {
  results.value = [];
  total_count.value = 0;
}

const pageSize = ref(50);
const currPage = ref(1);
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const offset = computed(() => (currPage.value - 1) * pageSize.value);
function resetPagination() {
  currPage.value = 1;
  pageSize.value = 50;
}

const filterGroups = ref({});
const filterKeys = ["genes", "cln_sig", "func", "exonic_func"];
const filterLabels = [
  "Genes",
  "ClinVar Significance",
  "Function",
  "Exonic Function",
];
const filterDefaults = () => ({
  genes: [],
  cln_sig: [],
  func: [],
  exonic_func: [],
});
const filters = ref(filterDefaults());
const resetFilters = () => {
  filters.value = filterDefaults();
};

const numericFilterKeys = [
  "cadd_phred",
  "polyphen_max",
  "revel_max",
  "sift_max",
];
const numericFilterLabels = [
  "cadd_phred",
  "polyphen_max",
  "revel_max",
  "sift_max",
];
const numericFilterDefaults = () => ({
  cadd_phred: { min: null, max: null },
  polyphen_max: { min: null, max: null },
  revel_max: { min: null, max: null },
  sift_max: { min: null, max: null },
});
const numericFilters = ref(numericFilterDefaults());
const resetNumericFilters = () => {
  numericFilters.value = numericFilterDefaults();
};

// accordian state
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

snapshotsService.getAll().then((res) => {
  snapshot_options.value = res.data.map((s) => s.name);
  snapshot.value = snapshot_options.value[0];
});

// thTile is used to set the column header tooltip
const columns = {
  chr: {
    label: "Variant ID",
    thTitle: "chromosome-position-ref-alt",
    _show: true,
  },
  allele_number: {
    label: "AN",
    category: "Indiana Biobank",
    thTitle: "Allele Number",
    _show: true,
    numeric: true,
  },
  allele_count: {
    label: "AC",
    category: "Indiana Biobank",
    thTitle: "Allele Count",
    _show: true,
    numeric: true,
  },
  allele_freq: {
    label: "AF",
    category: "Indiana Biobank",
    thTitle: "Allele Frequency",
    _show: true,
  },
  func: {
    label: "Func.",
    category: "Genes",
    _show: true,
  },
  genes: {
    label: "Genes",
    category: "Genes",
    _show: true,
  },
  exonic_func: {
    label: "Exonic Func.",
    category: "Genes",
    _show: true,
  },
  aa_change: {
    label: "Protien Change",
    category: "Genes",
    _show: true,
  },
  cln_sig: {
    label: "ClinVar Sig.",
    category: "ClinVAR",
    _show: true,
  },
  cadd_phred: {
    label: "CADD",
    category: "Info",
    _show: true,
    numeric: true,
  },
  polyphen_max: {
    label: "Polyphen",
    category: "Info",
    _show: true,
    numeric: true,
  },
  revel_max: {
    label: "Revel",
    category: "Info",
    _show: true,
    numeric: true,
  },
  sift_max: {
    label: "SIFT",
    category: "Info",
    _show: true,
    numeric: true,
  },
  af_afr: {
    label: "AF AFR",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_sas: {
    label: "AF SAS",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_amr: {
    label: "AF AMR",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_eas: {
    label: "AF EAS",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_nfe: {
    label: "AF NFE",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_fin: {
    label: "AF FIN",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_asj: {
    label: "AF ASJ",
    category: "AF",
    _show: false,
    numeric: true,
  },
  af_oth: {
    label: "AF OTH",
    category: "AF",
    _show: false,
    numeric: true,
  },
  cln_allele_id: {
    label: "CLN Allele ID",
    category: "ClinVAR",
    _show: false,
  },
  cln_cond: {
    label: "CLN Cond.",
    category: "ClinVAR",
    _show: false,
  },
  cln_dis_db: {
    label: "CLN Dis. DB",
    category: "ClinVAR",
    _show: false,
  },
  cln_rev_stat: {
    label: "CLN Rev. Stat.",
    category: "ClinVAR",
    _show: false,
  },
};

// add thStyle: "cursor: help;", to each column
Object.values(columns).forEach((col) => {
  col.thStyle = "cursor: help;";
});

function getDefaultColumns() {
  // return an object with the same keys as columns with the value of _show (boolean)
  return Object.entries(columns).reduce((acc, [key, col]) => {
    acc[key] = col._show;
    return acc;
  }, {});
}
// reactive object key: boolean
const columnsSelected = ref(getDefaultColumns());

// reactive array intended to be used as the columns prop for va-data-table
const table_columns = ref([]);

// watch columnsSelected and update table_columns
watch(
  columnsSelected,
  () => {
    // add or remove columns from table_columns preserving the existing order

    // remove from current columns that are no longer selected
    const filtered_columns = table_columns.value.filter(
      (col) => columnsSelected.value[col.key],
    );
    const current_col_keys = new Set(filtered_columns.map((col) => col.key));

    // columns that are not in table_columns but are selected
    const new_columns = Object.entries(columnsSelected.value)
      .filter(([key, shown]) => shown && !current_col_keys.has(key))
      .map(([key, _]) => ({ key, ...columns[key] }));
    table_columns.value = filtered_columns.concat(new_columns);
  },
  { deep: true, immediate: true },
);

// non-reactive
const colums_by_category = Object.entries(columns).reduce((acc, [key, col]) => {
  if (!col.category) return acc;
  acc[col.category] = (acc[col.category] || []).concat({ key, ...col });
  return acc;
}, {});

const columnsModal = ref(false);
const selected = ref([]);

function restoreColumnDefaults() {
  columnsSelected.value = getDefaultColumns();
  table_columns.value = Object.entries(columns)
    .filter(([_, col]) => col._show)
    .map(([key, col]) => ({ key, ...col }));
}

watchDebounced([currPage, pageSize, filters, numericFilters], handleSearch, {
  deep: true,
  debounce: 500,
});

function handleSearch() {
  const parsedQuery = parseQuery(query.value);
  // validate that parsedQuery is not empty
  if (Object.keys(parsedQuery).length === 0) {
    return;
  }

  const query_opts = {
    ...parsedQuery,
    source_id: source.value,
    // snapshot: snapshot.value,
    ...filters.value,
    ...numericFilters.value,
  };
  console.log("searching", query_opts);

  loading.value = true;

  variantService
    .search({
      query: query_opts,
      offset: offset.value,
      limit: pageSize.value,
    })
    .then((res) => {
      results.value = res.data?.results || [];
      total_count.value = res.data?.metadata?.count || 0;
      ui.setSidebarCollapsed(true);
      resultsView.value = total_count.value > 0;
      searchPerformed.value = true;
    })
    .catch((err) => {
      // if 400 status, show error message
      if (err?.response?.status === 400) {
        toast.error("Invalid query. Please check your query and try again.");
      } else {
        throw err;
      }
    })
    .finally(() => {
      loading.value = false;
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

function reset() {
  resetResults();
  resetPagination();
  resetFilters();
  resetNumericFilters();

  searchPerformed.value = false;
  query.value = "";
  resultsView.value = false;
  filterAccordian.value = [true, false, false, false];
  selected.value = [];
}

function handleSelectionChange(ev) {
  selected.value = ev.currentSelectedItems;
}
</script>

<style scoped>
.annotationtable {
  --va-data-table-cell-padding: 2px;

  /* in Vuestic v1.8.7 va-virtual-scroller css class is applied to table even
  *  when virtual scrolling is disabled. This causes the table to occupy 100% of 
  * the height of the parent container. This is a workaround to override that
  * behavior.
  */
  height: auto;
}
</style>

<route lang="yaml">
meta:
  title: Variant Xplorer
  nav: [{ label: "Variant Xplorer" }]
</route>
