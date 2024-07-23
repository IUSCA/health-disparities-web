<template>
  <div class="">
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

    <VaCard class="mt-3">
      <VaCardContent>
        <PhenotypeTop10Terms
          :category="props.category"
          :keyword="debouncedKeyword"
        />
      </VaCardContent>
    </VaCard>

    <div class="mt-5">
      <p>
        The table below displays the terms related to
        {{ category_labels[props.category] }} that match the search keyword. The
        participant count represents the number of participants who have the
        term in their record.
      </p>

      <p class="mt-2">
        The total number of participants in the biobank is
        <b> {{ totalParticipantCount }} </b>.
      </p>
    </div>

    <VaDataTable
      :columns="columns"
      :items="names"
      :loading="loading"
      class="datatable mt-3"
      clickable
      hoverable
      @row:click="handleClick"
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

      <template #cell(actions)="{ isExpanded }">
        <va-button
          preset="plain"
          :title="isExpanded ? 'Hide' : 'Visualize Participants'"
        >
          <Icon
            :icon="isExpanded ? 'mdi:graph-box' : 'mdi-graph-box-outline'"
            class="text-2xl"
          />
        </va-button>
      </template>

      <template #expandableRow="{ rowData }">
        <div
          class="pl-5 pt-2 pb-5 bg-[var(--va-background-element)] border border-solid border-t-0 border-[var(--va-background-border)]"
        >
          <DataBrowserParticipantVisualization
            :category="props.category"
            :name="rowData.name"
          />
        </div>
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
  </div>
</template>

<script setup>
import config from "@/config";
import dataBrowserService from "@/services/data_browser";
import participantsService from "@/services/participants";
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
const debouncedKeyword = refDebounced(filterInput, config.debounce_ms);

const columns = [
  {
    key: "name",
    tdStyle:
      "white-space: pre-wrap; word-wrap: break-word; word-break: break-word; min-width: 200px;",
  },
  {
    key: "count",
    label: "Participant Count",
    width: "130px",
    thAlign: "center",
    tdAlign: "center",
  },
  {
    key: "percentage",
    width: "130px",
    label: "% of All Participants",
    thAlign: "center",
    tdAlign: "center",
  },
  {
    key: "actions",
    label: "Actions",
    width: "60px",
    thAlign: "center",
    tdAlign: "center",
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

  participantsService.getTotalCount().then((res) => {
    totalParticipantCount.value = res.data?.total || 0;
  });
});

function handleClick({ row }) {
  row.toggleRowDetails();
}
</script>

<style scoped>
:deep(.va-data-table__table-tr--expanded) td {
  background: var(--va-background-border);
}

:deep(.va-data-table__table-expanded-content) td {
  background-color: var(--va-background-element);
}
</style>

<route lang="yaml">
meta:
  title: Data Browser
</route>
