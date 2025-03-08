<template>
  <div>
    <!-- search bar and filter -->
    <div class="flex mb-3 gap-3">
      <!-- search bar -->
      <div class="flex-1">
        <va-input
          :model-value="params.inclusive_query"
          class="w-full"
          placeholder="Search using key or username"
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
        @click="newAccessKeyModal.show()"
        color="success"
        class="flex-none"
      >
        <i-mdi-plus class="mr-1" />
        <span> Generate New Key </span>
      </va-button>
    </div>

    <VaDataTable
      :items="keys"
      :columns="columns"
      :loading="data_loading"
      v-model:sort-by="params.sort_by"
      v-model:sorting-order="params.sort_order"
      disable-client-side-sorting
    >
      <!-- key -->
      <template #cell(key)="{ rowData, source }">
        <div class="flex items-center">
          <span
            class="mr-2 va-link"
            @click="detailsModal.show(rowData)"
            @keydown.enter="detailsModal.show(rowData)"
            role="button"
            tabindex="0"
          >
            {{ source }}
          </span>
          <router-link
            :to="`/audit_logs?api_key=${source}`"
            class="text-xs text-gray-500 hover:text-gray-700 flex hover:underline"
          >
            <i-mdi-file-chart-outline class="mr-0.5" />
            <span> Logs </span>
          </router-link>
        </div>
      </template>

      <template #cell(user)="{ source }">
        <span> {{ source.username }} </span>
      </template>

      <template #cell(is_expired)="{ rowData }">
        <span>
          {{ getStatus(rowData) }}
        </span>
      </template>

      <template #cell(created_at)="{ value }">
        <span>{{ datetime.date(value) }}</span>
      </template>

      <template #cell(last_used_at)="{ value }">
        <LastUsed :lastUsedAt="value" />
      </template>

      <template #cell(expires_at)="{ value }">
        <!-- ex: in 30 days -->
        <ExpiresIn :expiresAt="value" />
      </template>

      <!-- actions -->
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2">
          <!-- revoke -->
          <va-button
            size="small"
            preset="primary"
            color="danger"
            @click="handleRevoke(rowData)"
          >
            <div class="flex gap-1 items-center">
              <i-mdi-block-helper class="text-xs" />
              <span>Revoke</span>
            </div>
          </va-button>

          <!-- delete -->
          <va-button
            size="small"
            preset="primary"
            color="danger"
            @click="handleDelete(rowData)"
          >
            <div class="flex gap-1 items-center">
              <i-mdi-delete class="text-xs" />
              <span>Delete</span>
            </div>
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
      :curr_items="keys.length"
      :page_size_options="PAGE_SIZE_OPTIONS"
    />
  </div>

  <NewAccessKeyModal ref="newAccessKeyModal" @update="fetchKeys" />
  <AccessKeyDetailsModal ref="detailsModal" />
</template>

<script setup>
import useQueryPersistence from "@/composables/useQueryPersistence";
import config from "@/config";
import accessKeyService from "@/services/access_keys";
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import { useModal } from "vuestic-ui";

// const props = defineProps({})

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

const keys = ref([]);
const data_loading = ref(false);
const params = ref(defaultParams());
const total_results = ref(0);
const detailsModal = ref(false);

useQueryPersistence({
  refObject: params,
  defaultValueFn: defaultParams,
  key: "q",
  history_push: true,
});

const columns = [
  {
    key: "key",
  },
  {
    key: "is_expired",
    label: "Status",
  },
  {
    key: "user",
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
  },
  {
    key: "last_used_at",
    label: "Last Used",
  },
  {
    key: "expires_at",
    label: "Expires in",
    sortable: true,
  },
  {
    key: "actions",
    width: "160px",
    tdAlign: "right",
    thAlign: "center",
  },
];
const newAccessKeyModal = ref(null);
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function fetchKeys() {
  data_loading.value = true;
  accessKeyService
    .getAll({
      params: {
        search: params.value.inclusive_query,
        sort_by: params.value.sort_by,
        sort_order: params.value.sort_order,
        offset: (params.value.page - 1) * params.value.page_size,
        limit: params.value.page_size,
      },
    })
    .then((res) => {
      keys.value = res.data?.data || [];
      total_results.value = res.data?.metadata?.total || 0;
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to fetch access keys");
    })
    .finally(() => {
      data_loading.value = false;
    });
}

onMounted(fetchKeys);

function handleRevoke(row) {
  confirm({
    message: `Are you sure you want to revoke the access key for ${row.user.username}?`,
    okText: "Revoke",
  }).then((ok) => {
    if (!ok) {
      return;
    }
    data_loading.value = true;
    accessKeyService
      .revoke({ username: row.user.username, key: row.key })
      .then(() => {
        toast.success("Access key revoked");
        fetchKeys();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to revoke access key");
      })
      .finally(() => {
        data_loading.value = false;
      });
  });
}

function handleDelete(row) {
  confirm({
    message: `Are you sure you want to delete the access key ${row.key}? This action cannot be undone. Associated audit logs will be deleted.`,
    okText: "Delete",
  }).then((ok) => {
    if (!ok) {
      return;
    }
    data_loading.value = true;
    accessKeyService
      .delete(row.key)
      .then(() => {
        toast.success("Access key deleted");
        fetchKeys();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete access key");
      })
      .finally(() => {
        data_loading.value = false;
      });
  });
}

function getStatus(row) {
  if (row.revoked) {
    return "Revoked";
  }
  if (accessKeyService.isExpired(row)) {
    return "Expired";
  }
  return "Active";
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
    fetchKeys();
  },
  {
    deep: true,
  },
);

watch(() => params.value.page, fetchKeys);
</script>

<route lang="yaml">
meta:
  title: Access Keys
  requiresRoles: ["admin"]
  nav: [{ label: "Access Keys" }]
</route>
