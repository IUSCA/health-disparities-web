<template>
  <!-- search bar and filter -->
  <div class="flex mb-3 gap-3">
    <!-- search bar -->
    <div class="flex-1">
      <va-input
        :model-value="params.inclusive_query"
        class="w-full"
        placeholder="keyword that matches any part of API key or endpoint"
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
  <div>
    <VaDataTable
      :items="logs"
      :columns="columns"
      :loading="data_loading"
      v-model:sort-by="params.sort_by"
      v-model:sorting-order="params.sort_order"
      disable-client-side-sorting
      class="api-audit-table text-sm"
    >
      <template #cell(endpoint)="{ value }">
        <VaPopover class="w-full" :hover-over-timeout="500">
          <template #body>
            <p class="max-w-sm">
              {{ value }}
            </p>
          </template>
          <p class="truncate">{{ value }}</p>
        </VaPopover>
      </template>

      <template #cell(api_key)="{ source }">
        <VaPopover class="w-full" :hover-over-timeout="500" v-if="source">
          <template #body>
            <div class="max-w-sm">
              <TokenSmall :_key="source.key" />
            </div>
          </template>
          <span>{{ source.key }}</span>
        </VaPopover>
      </template>

      <template #cell(accessed_at)="{ value }">
        <span>{{ datetime.absolute(value) }}</span>
      </template>

      <template #cell(scope)="{ source }">
        <span>{{ source ? source.name : "" }}</span>
      </template>
    </VaDataTable>

    <!-- pagination -->
    <Pagination
      class="mt-4 px-1 lg:px-3"
      v-model:page="params.page"
      v-model:page_size="params.itemsPerPage"
      :total_results="totalItems"
      :curr_items="logs.length"
      :page_size_options="PAGE_SIZE_OPTIONS"
    />
  </div>
</template>

<script setup>
import useQueryPersistence from "@/composables/useQueryPersistence";
import config from "@/config";
import apiKeyService from "@/services/api_keys";
import * as datetime from "@/services/datetime";
/*
{
    "id": 1,
    "api_key_id": 3,
    "endpoint": "/api_keys/scopes",
    "accessed_at": "2024-11-07T19:34:55.295Z",
    "http_method": "GET",
    "ip_address": null,
    "status_code": 200,
    "scope_id": null,
    "response_time": null,
    "request_body": null,
    "response_body": null,
    "api_key": {
        "id": 3,
        "name": "test key",
        "description": null,
        "user_id": 4,
        "key": "1a3a94acf910929975bd3fb762bbf735",
        "created_at": "2024-11-07T19:07:21.518Z",
        "expires_at": "2024-12-07T19:07:21.486Z",
        "revoked": false,
        "revoked_at": null,
        "ip_whitelist": []
    },
    "scope": null
}
*/

const route = useRoute();

function defaultParams() {
  return {
    inclusive_query: "",
    page: 1,
    itemsPerPage: 25,
    sort_by: "accessed_at",
    sort_order: "desc",
  };
}

const logs = ref([]);
const data_loading = ref(false);
const totalItems = ref(0);
const params = ref(defaultParams());
useQueryPersistence({
  refObject: params,
  defaultValueFn: defaultParams,
  key: "q",
  history_push: true,
});

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const columns = [
  {
    key: "endpoint",
    label: "Endpoint",
    width: "400px",
  },
  {
    key: "api_key",
    label: "API Key",
  },
  {
    key: "http_method",
    label: "Method",
    sortable: true,
  },
  {
    key: "status_code",
    label: "Status",
    sortable: true,
  },
  {
    key: "accessed_at",
    label: "Accessed At",
    sortable: true,
  },
  {
    key: "ip_address",
    label: "IP Address",
  },
  // {
  //   key: "scope",
  //   label: "Scope",
  // },
  {
    key: "response_time",
    label: "Response Time (ms)",
    sortable: true,
  },
];

const fetchLogs = useThrottleFn(() => {
  data_loading.value = true;
  apiKeyService
    .getAuditLogs({
      search: params.value.inclusive_query,
      limit: params.value.itemsPerPage,
      offset: (params.value.page - 1) * params.value.itemsPerPage,
      sort_by: params.value.sort_by,
      sort_order: params.value.sort_order,
    })
    .then((res) => {
      logs.value = res.data?.data || [];
      totalItems.value = res.data?.metadata?.count || 0;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      data_loading.value = false;
    });
}, 100);

watch(() => params.value.page, fetchLogs);
watch(
  () => [
    params.value.inclusive_query,
    params.value.itemsPerPage,
    params.value.sort_by,
    params.value.sort_order,
  ],
  () => {
    if (params.value.page !== 1) {
      params.value.page = 1;
    }
    fetchLogs();
  },
  {
    deep: true,
  },
);

onMounted(() => {
  // if api_key is in route query params, filter logs by apiKey. Set inclusive_query to apiKey
  // console.log("route", route.query);
  if (route.query.api_key) {
    const val = route.query.api_key;
    //   // delete route.query.api_key;
    params.value.inclusive_query = val;
  }
  fetchLogs();
});

const debouncedQueryUpdate = useDebounceFn((val) => {
  params.value.inclusive_query = val;
}, config.debounce_ms);
</script>

<route lang="yaml">
meta:
  title: API Audit Logs
  requiresRoles: ["admin"]
  nav: [{ label: "API Audit Logs" }]
</route>

<style scoped>
.api-audit-table {
  --va-data-table-cell-padding: 3px;
}
</style>
