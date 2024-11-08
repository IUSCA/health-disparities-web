<template>
  <div>
    <VaDataTable :items="logs" :columns="columns" :loading="data_loading">
      <template #cell(api_key)="{ source }">
        <span>{{ source ? source.key : "" }}</span>
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
import * as datetime from "@/services/datetime";
import apiKeyService from "@/services/api_keys";
import useQueryPersistence from "@/composables/useQueryPersistence";
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
function defaultParams() {
  return {
    page: 1,
    itemsPerPage: 25,
  };
}

const logs = ref([]);
const data_loading = ref(false);
const totalItems = ref(0);
const params = ref(defaultParams());
useQueryPersistence({
  refObject: params,
  defaultValueFn: defaultParams,
});

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const columns = [
  {
    key: "api_key",
    label: "API Key",
  },
  {
    key: "http_method",
    label: "Method",
  },
  {
    key: "endpoint",
    label: "Endpoint",
  },
  {
    key: "status_code",
    label: "Status",
  },
  {
    key: "accessed_at",
    label: "Accessed At",
  },
  // {
  //   key: "ip_address",
  //   label: "IP Address",
  // },
  {
    key: "scope",
    label: "Scope",
  },
  {
    key: "response_time",
    label: "Response Time (ms)",
  },
];

const fetchLogs = useThrottleFn(() => {
  data_loading.value = true;
  apiKeyService
    .getAuditLogs({
      limit: params.value.itemsPerPage,
      offset: (params.value.page - 1) * params.value.itemsPerPage,
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
  () => params.value.itemsPerPage,
  () => {
    params.value.page = 1;
  },
);
onMounted(fetchLogs);
</script>

<route lang="yaml">
meta:
  title: API Audit Logs
  requiresRoles: ["admin"]
  nav: [{ label: "API Audit Logs" }]
</route>
