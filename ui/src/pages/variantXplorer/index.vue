<template>
  <!-- search -->
  <va-form class="flex flex-wrap gap-3 items-start" ref="formRef">
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
      text-by="name"
      value-by="id"
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

    <!-- variant search input -->
    <va-input
      v-model="query"
      label="search"
      placeholder="Search by gene, variant, or genomic region"
      clearable
      inner-label
      @clear="reset"
      class="flex-none w-[370px]"
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

    <!-- search button -->
    <!-- <va-button
      icon="search"
      class="flex-none w-[150px]"
      color="success"
      @click="handleSearch"
    >
      Search
    </va-button> -->

    <!-- Participant Count, Variant Count, Column Legend Button -->
    <div class="flex-1">
      <div class="flex items-center lg:gap-3 xl:gap-5 justify-end">
        <!-- Participants Count-->
        <va-button
          class="flex-none"
          preset="secondary"
          :disabled="selected.length == 0"
        >
          <div
            class="flex flex-row gap-1 items-center text-xl text-teal-600 dark:text-teal-500 font-bold"
          >
            <NumberTransition
              :target="num_participants"
              :debounce="100"
              :duration="30"
              class="mr-1"
            />
            <!-- <span> {{ num_participants }} </span> -->
            <i-mdi:group-add class="" v-if="breakpoint.mdDown" />
            <div class="min-w-[108px]" v-else>
              {{ maybePluralize(num_participants, "Participant", "s", false) }}
            </div>
          </div>
        </va-button>

        <!-- Variants Count -->
        <div
          class="flex flex-row gap-1 items-center text-xl va-text-info font-bold"
        >
          <NumberTransition :target="total_count" class="mr-1" />

          <i-mdi:chart-sankey-variant class="" v-if="breakpoint.mdDown" />
          <span v-else>
            {{ maybePluralize(total_count, "Variant", "s", false) }}
          </span>
        </div>

        <!-- Column legend -->
        <va-button
          @click="columnsModal = true"
          class="flex-none"
          preset="secondary"
        >
          <i-mdi-drag-variant />
          <span class="ml-1" v-if="breakpoint.lgUp"> Columns </span>
        </va-button>

        <!-- <va-button
          class="flex-none"
          preset="primary"
          :disabled="selected.length == 0"
        >
          Selected ({{ selected.length }})
        </va-button> -->
      </div>
    </div>
  </va-form>

  <!-- results and filter -->
  <div class="flex pt-2" v-if="resultsView">
    <!-- results -->
    <div class="w-10/12 border-r border-solid border-gray-500">
      <!-- table -->
      <va-data-table
        :items="results"
        :columns="table_columns"
        :loading="loading"
        hoverable
        selectable
        @selectionChange="handleSelectionChange"
        sticky-header
        class="annotationtable text-sm"
      >
        <template #cell(chr)="{ rowData }">
          {{
            `${rowData.chr}-${rowData.position}-${rowData.ref}-${rowData.alt}`
          }}
        </template>

        <!-- 1/1 (c2) when unphased, 1|1 (c3) when phased -->
        <template #cell(homalt)="{ rowData }">
          {{ rowData.phase ? rowData.c3 : rowData.c2 }}
        </template>

        <!-- 1|0 c2 when phased -->
        <template #cell(hetflipped)="{ rowData }">
          {{ rowData.phase ? rowData.c2 : null }}
        </template>
      </va-data-table>

      <!-- pagination -->
      <Pagination
        class="px-1 lg:px-3 mt-2"
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
        <!-- <VaCollapse
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
        </VaCollapse> -->

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

  <!-- search examples and No results -->
  <div class="flex flex-col justify-center items-center mt-24" v-else>
    <!-- No results found message -->
    <!-- <div
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
    </div> -->

    <div>
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
              throttledSearch();
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
              throttledSearch();
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
              throttledSearch();
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
            <div class="flex flex-col mt-2">
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
            {
              key: 'category',
              label: 'Category',
              sortable: true,
              width: '100px',
            },
            { key: 'label', label: 'Name', sortable: true, width: '150px' },
            {
              key: 'thTitle',
              label: 'Description',
              sortable: true,
              tdStyle: 'white-space: pre-wrap; word-wrap: break-word;',
            },
          ]"
          striped
          sticky-header
          style="height: 200px; overflow-y: scroll"
          class="legendtable"
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
import { useBreakpoint, useColors } from "vuestic-ui";

const ui = useUIStore();
const { colors } = useColors();
const breakpoint = useBreakpoint();

const NUMERIC_PRECISION = 3;

const query = ref("");
const source = ref(1);
const snapshot = ref();
const resultsView = ref(false);
const loading = ref(false);
// const searchPerformed = ref(false);
const num_participants = ref(0);

const results = ref([]);
const total_count = ref(0);
function resetResults() {
  results.value = [];
  total_count.value = 0;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE_IDX = 0;
const pageSize = ref(PAGE_SIZE_OPTIONS[DEFAULT_PAGE_SIZE_IDX]);
const currPage = ref(1);
const offset = computed(() => (currPage.value - 1) * pageSize.value);
function resetPagination() {
  currPage.value = 1;
  pageSize.value = PAGE_SIZE_OPTIONS[DEFAULT_PAGE_SIZE_IDX];
}

// const filterGroups = ref({});
// const filterKeys = ["genes", "cln_sig", "func", "exonic_func"];
// const filterLabels = [
//   "Genes",
//   "ClinVar Significance",
//   "Function",
//   "Exonic Function",
// ];
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
  "allele_number",
  "allele_count",
  "allele_frequency",
  "cadd_phred",
  "polyphen_max",
  "revel_max",
  "sift_max",
];
const numericFilterLabels = [
  "Allele Number",
  "Allele Count",
  "Allele Frequency",
  "CADD Phred",
  "Plolyphen Max",
  "Revel Max",
  "SIFT Max",
];
const numericFilterDefaults = () => ({
  allele_number: { min: null, max: null },
  allele_count: { min: null, max: null },
  allele_frequency: { min: null, max: null },
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
const filterAccordian = ref([false, false, false, false]);
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
  snapshot_options.value = res.data;
  snapshot.value = snapshot_options.value[0].id;
});

// thTile is used to set the column header tooltip
const columns = {
  chr: {
    label: "Variant ID",
    thTitle: "chromosome-position-ref-alt",
    _show: true,
    tdClass: "va-text-primary",
    width: "160px",
    tdStyle: "white-space: pre-wrap; word-wrap: break-word;",
  },
  allele_number: {
    label: "AN",
    category: "Allele Stats",
    thTitle: "Allele Number",
    _show: true,
    numeric: true,
  },
  allele_count: {
    label: "AC",
    category: "Allele Stats",
    thTitle: "Alternate Allele Count",
    _show: true,
    numeric: true,
  },
  allele_frequency: {
    label: "AF",
    category: "Allele Stats",
    thTitle: "Alternate Allele Frequency",
    _show: true,
    numeric: true,
  },
  c0: {
    // c0 is used to represent 0/0 and 0|1
    label: "Hom. Ref.",
    category: "Allele Stats",
    thTitle: "Homozygous Reference (0/0 or 0|0)",
    _show: true,
    numeric: true,
  },
  c1: {
    // c1 is used to represent 0/1 and 0|1
    label: "Het",
    category: "Allele Stats",
    thTitle: "Heterozygous (0/1 or 0|1)",
    _show: true,
    numeric: true,
  },
  hetflipped: {
    // corresponds to c2, defined only when phase is true
    label: "Het. Flipped",
    category: "Allele Stats",
    thTitle: "Flipped Heterozygous (1|0)",
    _show: true,
    numeric: true,
  },
  homalt: {
    // corresponds to c3, when phase is true
    // corresponds to c2, when phase is false
    // represents 1/1 or 1|1
    label: "Hom. Alt.",
    category: "Allele Stats",
    thTitle: "Homozygous Alternate (1/1 or 1|1)",
    _show: true,
    numeric: true,
  },
  missing: {
    label: "Missing",
    category: "Allele Stats",
    thTitle: "./. Missing Genotypes",
    _show: true,
    numeric: true,
  },
  func: {
    label: "Func.",
    category: "Genes",
    thTitle: "Function",
    _show: false,
  },
  genes: {
    label: "Genes",
    category: "Genes",
    thTitle: "Genes",
    _show: false,
  },
  exonic_func: {
    label: "Exonic Func.",
    category: "Genes",
    thTitle: "Exonic Function",
    _show: false,
  },
  aa_change: {
    label: "Protien Change",
    category: "Genes",
    thTitle: "Amino Acid Change",
    _show: false,
  },
  cln_sig: {
    label: "ClinVar Sig.",
    category: "ClinVAR",
    thTitle: "ClinVar Significance",
    _show: false,
  },
  cadd_phred: {
    label: "CADD",
    category: "Info",
    thTitle:
      "Cadd Phred-like scores ('scaled C-scores') ranging from 1 to 99, based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values are more deleterious.",
    _show: true,
    numeric: true,
  },
  polyphen_max: {
    label: "Polyphen",
    category: "Info",
    thTitle:
      "Score that predicts the possible impact of an amino acid substitution on the structure and function of a human protein, ranging from 0.0 (tolerated) to 1.0 (deleterious).  We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.",
    _show: true,
    numeric: true,
  },
  revel_max: {
    label: "Revel",
    category: "Info",
    thTitle:
      "The maximum REVEL score at a site's MANE Select or canonical transcript. It's an ensemble score for predicting the pathogenicity of missense variants (based on 13 other variant predictors). Scores ranges from 0 to 1. Variants with higher scores are predicted to be more likely to be deleterious.",
    _show: true,
    numeric: true,
  },
  sift_max: {
    label: "SIFT",
    category: "Info",
    thTitle:
      "Score reflecting the scaled probability of the amino acid substitution being tolerated, ranging from 0 to 1. Scores below 0.05 are predicted to impact protein function. We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.",
    _show: true,
    numeric: true,
  },
  af_afr: {
    label: "AF AFR",
    category: "AF",
    thTitle:
      "Alternate allele frequency in samples of African/African-American ancestry",
    _show: false,
    numeric: true,
  },

  af_amr: {
    label: "AF AMR",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of Latino ancestry",
    _show: false,
    numeric: true,
  },
  af_asj: {
    label: "AF ASJ",
    category: "AF",
    thTitle:
      "Alternate allele frequency in samples of Ashkenazi Jewish ancestry",
    _show: false,
    numeric: true,
  },
  af_eas: {
    label: "AF EAS",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of East Asian ancestry",
    _show: false,
    numeric: true,
  },
  af_fin: {
    label: "AF FIN",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of Finnish ancestry",
    _show: false,
    numeric: true,
  },
  af_nfe: {
    label: "AF NFE",
    category: "AF",
    thTitle:
      "Alternate allele frequency in samples of Non-Finnish European ancestry",
    _show: false,
    numeric: true,
  },
  af_sas: {
    label: "AF SAS",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of South Asian ancestry",
    _show: false,
    numeric: true,
  },
  af_oth: {
    label: "AF OTH",
    category: "AF",
    thTitle: "Alternate allele frequency in samples of other ancestry",
    _show: false,
    numeric: true,
  },
  cln_allele_id: {
    label: "CLN Allele ID",
    category: "ClinVAR",
    thTitle: "ClinVar Allele ID",
    _show: false,
  },
  cln_cond: {
    label: "CLN Cond.",
    category: "ClinVAR",
    thTitle: "ClinVar Condition",
    _show: false,
  },
  cln_dis_db: {
    label: "CLN Dis. DB",
    category: "ClinVAR",
    thTitle: "ClinVar Disease Database Name and Identifier",
    _show: false,
  },
  cln_rev_stat: {
    label: "CLN Rev. Stat.",
    category: "ClinVAR",
    thTitle: "ClinVar Review Status",
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

// it will be called at most 1 time per 800 ms
const throttledSearch = useThrottleFn(handleSearch, 800);

watchDebounced([query, filters, numericFilters], throttledSearch, {
  deep: true,
  debounce: 750,
});

watch([source, snapshot, currPage, pageSize], throttledSearch);

function formatNumericData(data) {
  // data is column_key: value object, value is sometimes a number
  // columns is column_key: column object
  // for each column, if it is a numeric column, format the number
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (columns[key]?.numeric) {
      acc[key] = value != null ? _.round(value, NUMERIC_PRECISION) : null;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function handleSearch() {
  const parsedQuery = parseQuery(query.value);
  // validate that parsedQuery is not empty
  if (Object.keys(parsedQuery).length === 0) {
    return;
  }

  const query_opts = {
    ...parsedQuery,
    source_id: source.value,
    snapshot_id: snapshot.value,
    ...filters.value,
    ...numericFilters.value,
  };
  console.log("searching", query_opts);

  loading.value = true;
  selected.value = [];

  // variantService
  //   .search2({
  //     query: query_opts,
  //     offset: offset.value,
  //     limit: pageSize.value,
  //   })
  //   .then((res) => console.log(res));

  variantService
    .search2({
      query: query_opts,
      offset: offset.value,
      limit: pageSize.value,
    })
    .then((res) => {
      results.value = (res.data?.results || []).map(formatNumericData);
      total_count.value = res.data?.metadata?.count || results.value.length;
      ui.setSidebarCollapsed(true);
      resultsView.value = true;
      // searchPerformed.value = true;
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

  // variantService
  //   .getFilters({
  //     query: query_opts,
  //   })
  //   .then((res) => {
  //     filterGroups.value = res.data;
  //   })
  //   .catch((err) => {
  //     console.error(err);
  //   });
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

  const variantRegex = /^([\dXY]+)-(\d+)-([ATCG]+)-([ATCG]+)$/;
  const genomicRegionRegex = /^CHR([\dXY]+):(\d+)-(\d+)$/;
  const geneRegex = /^([a-zA-Z0-9]+)$/;

  text = text.trim().toUpperCase();
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

  // searchPerformed.value = false;
  query.value = "";
  resultsView.value = false;
  filterAccordian.value = [false, false, false, false];
  selected.value = [];
}

function handleSelectionChange(ev) {
  selected.value = ev.currentSelectedItems;
}

watchDebounced(
  selected,
  () => {
    if (selected.value.length == 0) {
      num_participants.value = 0;
      return;
    }
    variantService
      .getParticipantCount({
        variant_ids: selected.value.map((row) => [
          row.chr,
          row.position,
          row.ref,
          row.alt,
        ]),
        snapshot_id: snapshot.value,
        source_id: source.value,
      })
      .then((res) => {
        num_participants.value = Number(res.data?.count || 0);
      });
  },
  { debounce: 500 },
);
</script>

<style scoped>
.annotationtable {
  --va-data-table-cell-padding: 1px;

  /* in Vuestic v1.8.7 va-virtual-scroller css class is applied to table even
  *  when virtual scrolling is disabled. This causes the table to occupy 100% of 
  * the height of the parent container. This is a workaround to override that
  * behavior.
  */
  height: auto;
}
.legendtable {
  --va-data-table-cell-padding: 3px;
}
</style>

<route lang="yaml">
meta:
  title: Variant Xplorer
  nav: [{ label: "Variant Xplorer" }]
</route>
