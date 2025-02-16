<template>
  <!-- search bar and filter -->
  <div class="flex mb-3 gap-3">
    <!-- search bar -->
    <div class="flex-1">
      <va-input
        :model-value="params.inclusive_query"
        class="w-full"
        placeholder="Search scopes"
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
    <va-button @click="handleNewScope" color="success" class="flex-none">
      <i-mdi-plus class="mr-1" />
      <span> New Scope </span>
    </va-button>
  </div>
  <div class="mt-1">
    <VaDataTable :items="scopes" :columns="columns" :loading="loading">
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2">
          <va-button
            color="danger"
            size="small"
            preset="primary"
            @click="() => deleteScope(rowData.id)"
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
      :curr_items="scopes.length"
      :page_size_options="PAGE_SIZE_OPTIONS"
    />
  </div>

  <VaModal
    v-model="newScopeModal"
    title="Create New Scope"
    close-button
    fixed-layout
    hide-default-actions
    no-dismiss
  >
    <NewScope
      @created="
        newScopeModal = false;
        fetchScopes();
      "
      @cancel="newScopeModal = false"
    />
  </VaModal>
</template>

<script setup>
import config from "@/config";
import apiKeyService from "@/services/api_keys";
import toast from "@/services/toast";
import { useModal } from "vuestic-ui";

const { confirm } = useModal();

function defaultParams() {
  return {
    inclusive_query: "",
    page: 1,
    page_size: 25,
  };
}

const scopes = ref([]);
const loading = ref(false);
const params = ref(defaultParams());
const total_results = ref(0);

/*
{ "id": 1, "name": "read:scopes", "resource": "scopes", "action": "read", "description": "GET /api_keys/scopes" }
*/

const columns = [
  {
    key: "name",
    label: "Name",
  },
  {
    key: "resource",
    label: "Resource",
  },
  {
    key: "action",
    label: "Action",
  },
  {
    key: "description",
    label: "Description",
  },
  {
    key: "actions",
    label: "Actions",
    width: "100px",
  },
];
const newScopeModal = ref(false);
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function fetchScopes() {
  loading.value = true;
  apiKeyService
    .getAllScopes({
      search: params.value.inclusive_query,
      offset: (params.value.page - 1) * params.value.page_size,
      limit: params.value.page_size,
    })
    .then((res) => {
      scopes.value = res.data?.data || [];
      total_results.value = res.data?.metadata?.total || 0;
    })
    .catch((err) => {
      console.error(err);
      toast.error("Error fetching scopes");
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleNewScope() {
  newScopeModal.value = true;
}
const debouncedQueryUpdate = useDebounceFn((val) => {
  params.value.inclusive_query = val;
}, config.debounce_ms);

watch(
  () => [params.value.inclusive_query, params.value.page_size],
  () => {
    if (params.value.page !== 1) params.value.page = 1;
    fetchScopes();
  },
  {
    deep: true,
  },
);

watch(() => params.value.page, fetchScopes);

function deleteScope(id) {
  confirm("Are you sure you want to delete this scope?").then((ok) => {
    if (!ok) {
      return;
    }
    loading.value = true;
    apiKeyService
      .deleteScope(id)
      .then(() => {
        toast.success("Scope deleted successfully");
        fetchScopes();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error deleting scope");
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

onMounted(fetchScopes);
</script>

<route lang="yaml">
meta:
  title: Scopes
  requiresRoles: ["admin"]
  nav: [{ label: "Scopes" }]
</route>
