<template>
  <!-- search bar -->
  <div class="flex">
    <div class="flex-1">
      <va-input
        v-model="filterInput"
        class="w-full"
        placeholder="Search for data..."
        outline
        clearable
      >
        <template #prependInner>
          <Icon icon="material-symbols:search" class="text-xl" />
        </template>
      </va-input>
    </div>
  </div>

  <div class="mt-3 px-3">
    <PhenotypeTop10Terms
      :category="props.category"
      :keyword="debouncedKeyword"
    />
  </div>

  <div>
    The table below displays the terms related to
    {{ category_labels[props.category] }} that match the search keyword. The
    participant count represents the number of participants who have the term in
    their record.

    <br />

    The total number of participants in the database is
    <b>{{ totalParticipantCount }}</b
    >.
  </div>

  <VaDataTable
    :columns="columns"
    :items="names"
    :loading="loading"
    class="datatable mt-3 px-3"
  >
    <template #cell(percentage)="{ rowData }">
      <span
        v-if="
          Number.isFinite(totalParticipantCount) && totalParticipantCount > 0
        "
      >
        {{ ((rowData.count / totalParticipantCount) * 100).toFixed(2) }}%
      </span>
    </template>
  </VaDataTable>

  <Pagination
    class="mt-4 px-1 lg:px-3"
    v-model:page="currPage"
    v-model:page_size="pageSize"
    :total_results="totalResults"
    :curr_items="names.length"
    :page_size_options="PAGE_SIZE_OPTIONS"
  />
</template>

<script setup>
import cohortService from "@/services/cohort2";
import dataBrowserService from "@/services/data_browser";
import { useNavStore } from "@/stores/nav";

const props = defineProps({
  category: String,
});

const category_labels = {
  lab: "Labs",
  dx: "Diagnoses",
  medication: "Medications",
  hospital: "Hospitalizations",
};

const nav = useNavStore();
nav.setNavItems([
  {
    label: "Data Browser",
    to: "/data_browser",
  },
  {
    label: category_labels[props.category],
  },
]);

const route = useRoute();

const loading = ref(false);
const names = ref([]);
const totalParticipantCount = ref(0);

const currPage = ref(1);
const pageSize = ref(20);
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const totalResults = ref(0);

const filterInput = ref(route.query?.keyword || "");
const debouncedKeyword = refDebounced(filterInput, 500);

const columns = [
  {
    key: "name",
    tdStyle:
      "white-space: pre-wrap; word-wrap: break-word; word-break: break-word;",
  },
  {
    key: "count",
    label: "Participant Count",
    width: "200px",
  },
  {
    key: "percentage",
    width: "200px",
    label: "% of Total Participants",
  },
];

watch([debouncedKeyword, pageSize], () => {
  if (currPage.value === 1) {
    getParticipantCounts();
  } else {
    currPage.value = 1;
  }
});

watch(currPage, getParticipantCounts);

function getParticipantCounts() {
  loading.value = true;
  dataBrowserService
    .getParticipantCountsByName({
      category: props.category,
      keyword: debouncedKeyword.value,
      offset: (currPage.value - 1) * pageSize.value,
      limit: pageSize.value,
    })
    .then((res) => {
      names.value = res.data?.results || [];
      totalResults.value = res.data?.metadata?.total_count || 0;
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  getParticipantCounts();

  cohortService.getTotalParticipants().then((res) => {
    totalParticipantCount.value = res.data?.total || 0;
  });
});
</script>

<style scoped>
.datatable {
  --va-data-table-cell-padding: 2px;
}
</style>

<route lang="yaml">
meta:
  title: Data Browser
</route>
