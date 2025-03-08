<template>
  <div class="mt-3">
    <!-- search bar and filter -->
    <div class="flex mb-3 gap-3">
      <!-- search bar -->
      <div class="flex-1">
        <va-input
          :model-value="params.inclusive_query"
          class="w-full"
          placeholder="Search requests using requester's username or cohort name"
          outline
          clearable
          @update:model-value="debouncedQueryUpdate"
        >
          <template #prependInner>
            <Icon icon="material-symbols:search" class="text-xl" />
          </template>
        </va-input>
      </div>

      <!-- Create request button -->
      <va-button @click="createModal.show()" color="success" class="flex-none">
        <i-mdi-plus class="mr-1" />
        <span> Create Request </span>
      </va-button>
    </div>

    <!-- table -->
    <VaDataTable
      :loading="loading"
      :items="requests"
      :columns="columns"
      v-model:sort-by="params.sort_by"
      v-model:sorting-order="params.sort_order"
      disable-client-side-sorting
    >
      <template #cell(requester)="{ source }">
        <span> {{ source.username }} </span>
      </template>

      <template #cell(reviewer)="{ source }">
        <span> {{ source.username }} </span>
      </template>

      <template #cell(created_at)="{ source }">
        <span>{{ datetime.date(source) }}</span>
      </template>

      <template #cell(decision_date)="{ source }">
        <span>{{ datetime.date(source) }}</span>
      </template>

      <template #cell(cohort)="{ source }">
        <router-link :to="`/cohorts/builder?id=${source.id}`" class="va-link">
          {{ source.name }}
        </router-link>
      </template>

      <!-- actions: delete -->
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2">
          <va-button
            color="danger"
            size="small"
            preset="primary"
            @click="() => deleteRequest(rowData.id)"
          >
            <i-mdi-delete />
          </va-button>
        </div>
      </template>
    </VaDataTable>

    <!-- pagination -->
    <Pagination
      class="mt-4 px-1 lg:px-3"
      v-model:page="params.page"
      v-model:page_size="params.page_size"
      :total_results="total_results"
      :curr_items="requests.length"
      :page_size_options="PAGE_SIZE_OPTIONS"
    />
  </div>
  <CreateCohortAcessRequestModal ref="createModal" @created="fetchAll" />
</template>

<script setup>
// const props = defineProps({});
import useQueryPersistence from "@/composables/useQueryPersistence";
import config from "@/config";
import cohortAccessRequests from "@/services/cohort_access_requests";
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import { useModal } from "vuestic-ui";

const { confirm } = useModal();

function defaultParams() {
  return {
    inclusive_query: "",
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    page_size: 25,
  };
}

const loading = ref(false);
const requests = ref([]);
const params = ref(defaultParams());
const total_results = ref(0);

useQueryPersistence({
  refObject: params,
  defaultValueFn: defaultParams,
  key: "q",
  history_push: true,
});
const columns = [
  {
    key: "cohort",
    label: "Cohort",
  },
  {
    key: "requester",
    label: "Requester",
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
  },
  {
    key: "reviewer",
    label: "Reviewer",
  },
  {
    key: "decision_date",
    label: "Decision Date",
    sortable: true,
  },
  {
    key: "created_at",
    label: "Created On",
    sortable: true,
  },
  {
    key: "actions",
    label: "Actions",
    width: "100px",
  },
];
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const createModal = ref(null);

function fetchAll() {
  loading.value = true;
  cohortAccessRequests
    .getAll({
      search: params.value.inclusive_query,
      sort_by: params.value.sort_by,
      sort_order: params.value.sort_order,
      limit: params.value.page_size,
      offset: (params.value.page - 1) * params.value.page_size,
    })
    .then((response) => {
      requests.value = response.data.data;
      total_results.value = response.data.metadata.total;
    })
    .catch((error) => {
      console.error("Error fetching cohort access requests:", error);
      toast.error("Error fetching requests");
    })
    .finally(() => {
      loading.value = false;
    });
}

const debouncedQueryUpdate = useDebounceFn((val) => {
  params.value.inclusive_query = val;
}, config.debounce_ms);

watch(
  () => [
    params.value.inclusive_query,
    params.value.page_size,
    params.value.sort_by,
    params.value.sort_order,
  ],
  () => {
    if (params.value.page !== 1) params.value.page = 1;
    fetchAll();
  },
  {
    deep: true,
  },
);

watch(() => params.value.page, fetchAll);

onMounted(() => {
  fetchAll();
});

function deleteRequest(id) {
  confirm("Are you sure you want to delete this request?").then((ok) => {
    if (!ok) return;
    loading.value = true;
    cohortAccessRequests
      .delete(id)
      .then(() => {
        fetchAll();
      })
      .catch((error) => {
        console.error("Error deleting cohort access request:", error);
        toast.error("Error deleting request");
      })
      .finally(() => {
        loading.value = false;
      });
  });
}
</script>

<route lang="yaml">
meta:
  title: Cohort Access Requests
  requiresRoles: ["operator", "admin"]
  nav: [{ label: "Cohort Access Requests" }]
</route>
