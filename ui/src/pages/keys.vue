<template>
  <div>
    <VaDataTable :items="keys" :columns="columns" :loading="data_loading">
      <template #cell(user)="{ source }">
        <span> {{ source.username }} </span>
      </template>

      <template #cell(is_expired)="{ rowData }">
        <span>
          {{ apiKeyService.isExpired(rowData) ? "Expired" : "Active" }}
        </span>
      </template>

      <template #cell(created_at)="{ value }">
        <span>{{ datetime.date(value) }}</span>
      </template>

      <template #cell(last_used_at)="{ value }">
        <VaPopover
          v-if="value"
          :message="`Last used at: ${datetime.absolute(value)}`"
        >
          <span>{{ datetime.fromNow(value) }}</span>
        </VaPopover>
        <span v-else> Never Used </span>
      </template>

      <template #cell(expires_at)="{ value }">
        <!-- ex: in 30 days -->
        <VaPopover
          v-if="value"
          :message="`Expires at: ${datetime.absolute(value)}`"
        >
          <span>{{ maybePluralize(datetime.daysFromNow(value), "day") }}</span>
        </VaPopover>
      </template>

      <!-- actions -->
      <template #cell(actions)="{ rowData }">
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
      </template>
    </VaDataTable>
  </div>
</template>

<script setup>
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import apiKeyService from "@/services/api_keys";
import { maybePluralize } from "@/services/utils";

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
    label: "Expires in",
  },
  {
    key: "actions",
    width: "85px",
    tdAlign: "right",
    thAlign: "right",
  },
];

function fetchKeys() {
  data_loading.value = true;
  apiKeyService
    .getAll()
    .then((res) => {
      keys.value = res.data.data;
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

function handleRevoke(row) {
  console.log("delete", row);
  apiKeyService
    .revoke(row.user.username)
    .then(() => {
      toast.success("API key revoked");
      fetchKeys();
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to revoke API key");
    });
}
</script>

<route lang="yaml">
meta:
  title: API Keys
  requiresRoles: ["admin"]
  nav: [{ label: "API Keys" }]
</route>
