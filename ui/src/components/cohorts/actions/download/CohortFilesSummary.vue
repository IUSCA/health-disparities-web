<template>
  <VaInnerLoading :loading="loading">
    <!-- <div v-if="summary.length === 0" class="text-sm">No files available.</div> -->
    <div class="max-w-md">
      <VaDataTable
        :items="summary"
        :columns="columns"
        noDataHtml="No files available."
        class="cohort-files-summary-table text-sm"
      >
        <template #cell(total_size)="{ source }">
          <span>{{ formatBytes(source) }}</span>
        </template>
      </VaDataTable>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import cohortService from "@/services/cohorts2";
import toast from "@/services/toast";
import { formatBytes } from "@/services/utils";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

// [
//   {
//     file_type: "cram",
//     file_count: 10,
//     total_size: 1284238,
//   },
//   {
//     file_type: "gvcf",
//     file_count: 20,
//     total_size: 2284238,
//   },
// ]

const summary = ref([]);
const loading = ref(false);

const columns = [
  {
    key: "file_type",
    label: "File Type",
  },
  {
    key: "file_count",
    label: "File Count",
    sortable: true,
  },
  {
    key: "total_size",
    label: "Total Size",
    sortable: true,
  },
];

function fetchData() {
  loading.value = true;
  cohortService
    .getFilesSummary(props.id)
    .then((res) => {
      summary.value = res.data;
    })
    .catch((err) => {
      toast.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  // console.log("CohortFilesSummary.vue props.id", props.id);
  fetchData();
});

watch(
  () => props.id,
  () => {
    fetchData();
  },
);
</script>

<style scoped>
.cohort-files-summary-table {
  --va-data-table-cell-padding: 3px;
}
</style>
