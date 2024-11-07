<template>
  <div>
    <VaDataTable :items="keys" :columns="columns" :loading="data_loading">
      <template #cell(user)="{ source }">
        <span> {{ source.username }} </span>
      </template>

      <template #cell(is_expired)="{ rowData }">
        <span>
          {{ userService.isApiKeyexpired(rowData) ? "Expired" : "Active" }}
        </span>
      </template>

      <template #cell(created_at)="{ value }">
        <span>{{ datetime.date(value) }}</span>
      </template>

      <template #cell(last_used_at)="{ value }">
        <span>{{ value ? datetime.date(value) : "Never Used" }}</span>
      </template>

      <template #cell(expires_at)="{ value }">
        <span>{{ datetime.date(value) }}</span>
      </template>

      <!-- actions -->
      <template #cell(actions)="{ rowData }">
        <va-button
          size="small"
          preset="primary"
          color="danger"
          @click="handleDelete(rowData)"
        >
          <i-mdi-delete />
        </va-button>
      </template>
    </VaDataTable>
  </div>
</template>

<script setup>
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import userService from "@/services/user";

// const props = defineProps({})
const keys = ref([]);
const data_loading = ref(false);

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
  },
  {
    key: "last_used_at",
    label: "Last Used",
  },
  {
    key: "expires_at",
    label: "Expires",
  },
  {
    key: "actions",
    width: "75px",
    tdAlign: "right",
    thAlign: "right",
  },
];

function fetchKeys() {
  data_loading.value = true;
  userService
    .getApiKeys()
    .then((res) => {
      keys.value = res.data;
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to fetch API keys");
    })
    .finally(() => {
      data_loading.value = false;
    });
}

onMounted(fetchKeys);

function handleDelete(row) {
  console.log("delete", row);
  userService
    .deleteApiKey(row.user.username)
    .then(() => {
      toast.success("API key deleted");
      fetchKeys();
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to delete API key");
    });
}
</script>

<route lang="yaml">
meta:
  title: API Keys
  requiresRoles: ["admin"]
  nav: [{ label: "API Keys" }]
</route>
