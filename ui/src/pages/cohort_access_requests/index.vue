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
      <va-button
        @click="createModal.show()"
        color="success"
        class="flex-none"
        v-if="auth.canOperate"
      >
        <div class="flex items-center gap-2"></div>
        <i-mdi-plus class="" />
        <span> Create Request </span>
      </va-button>
    </div>

    <div class="">
      <va-alert
        class="text-sm"
        dense
        border="left"
        color="info"
        text-color="info"
      >
        <template #icon>
          <Icon icon="material-symbols:info" />
        </template>
        <span>
          Request status updates from the REDCap service may take a few minutes
          to appear, as they are synced periodically.
        </span>
      </va-alert>
    </div>

    <!-- table -->
    <VaDataTable
      :loading="loading"
      :items="requests"
      :columns="columns"
      v-model:sort-by="params.sort_by"
      v-model:sorting-order="params.sort_order"
      disable-client-side-sorting
      clickable
      hoverable
      @row:click="({ item }) => viewRequest(item.id)"
    >
      <template #cell(requester)="{ source }">
        <span> {{ source?.username }} </span>
      </template>

      <template #cell(status)="{ rowData }">
        <AccessRequestStatus :request="rowData" />
      </template>

      <template #cell(reviewer)="{ source }">
        <span> {{ source?.username }} </span>
      </template>

      <template #cell(created_at)="{ source }">
        <span>{{ datetime.date(source) }}</span>
      </template>

      <template #cell(decision_date)="{ source }">
        <span>{{ datetime.date(source) }}</span>
      </template>

      <template #cell(updated_at)="{ source }">
        <span>{{ datetime.date(source) }}</span>
      </template>

      <template #cell(last_synced_at)="{ source }">
        <span>{{ datetime.date(source) }}</span>
      </template>

      <template #cell(cohort)="{ source }">
        <div class="flex items-center gap-1 hover:text-blue-500">
          <i-mdi-account-multiple class="text-lg" />
          <router-link
            :to="cohortService.getCohortURL({ id: source.id })"
            class="va-link"
            @click.stop
          >
            {{ source.name }}
          </router-link>
        </div>
      </template>

      <!-- actions -->
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2">
          <!-- view -->
          <VaPopover message="View request" placement="top">
            <VaButton
              color="info"
              size="small"
              preset="primary"
              @click="() => viewRequest(rowData.id)"
            >
              <i-mdi-eye />
            </VaButton>
          </VaPopover>
          <!-- edit -->
          <VaPopover message="Edit request" placement="top">
            <VaButton
              color="primary"
              size="small"
              preset="primary"
              @click="editModal.show(rowData)"
            >
              <i-mdi-pencil />
            </VaButton>
          </VaPopover>

          <!-- delete -->
          <!-- <VaPopover message="Delete request" placement="top">
            <VaButton
              color="danger"
              size="small"
              preset="primary"
              @click="() => deleteRequest(rowData.id)"
            >
              <i-mdi-delete />
            </VaButton>
          </VaPopover> -->
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
  <CreateCohortAccessRequestModal ref="createModal" @created="fetchAll" />
  <EditCohortAccessRequestModal ref="editModal" @updated="fetchAll" />
</template>

<script setup>
// const props = defineProps({});
import useQueryPersistence from "@/composables/useQueryPersistence";
import config from "@/config";
import cohortAccessRequests from "@/services/cohort_access_requests";
import cohortService from "@/services/cohorts";
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

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
    sortable: true,
  },
  {
    key: "requester",
    label: "Requester",
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
  },
  {
    key: "decision_date",
    label: "Decision Date",
    sortable: true,
    width: "120px",
  },
  {
    key: "created_at",
    label: "Created On",
    sortable: true,
    width: "120px",
  },
  {
    key: "updated_at",
    label: "Last Updated On",
    sortable: true,
    width: "120px",
  },
  {
    key: "last_synced_at",
    label: "Last Synced On",
    sortable: true,
    width: "120px",
  },
  // {
  //   key: "actions",
  //   label: "Actions",
  //   width: "100px",
  // },
];
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const createModal = ref(null);
const editModal = ref(null);

function fetchAll() {
  loading.value = true;
  const fetchFn = auth.canOperate
    ? cohortAccessRequests.getAll
    : cohortAccessRequests.getAllForSelf;
  fetchFn({
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

function viewRequest(id) {
  if (id) {
    router.push({
      path: `/cohort_access_requests/${id}`,
    });
  }
}
</script>

<route lang="yaml">
meta:
  title: Cohort Access Requests
  nav: [{ label: "Cohort Access Requests" }]
</route>
