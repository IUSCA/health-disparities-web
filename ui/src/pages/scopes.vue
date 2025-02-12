<template>
  <div class="flex justify-end mt-[-2.3rem]">
    <VaButton icon="add" class="px-3" color="success" @click="handleNewScope">
      New Scope
    </VaButton>
  </div>
  <div class="mt-1">
    <VaDataTable :items="scopes" :columns="columns" :loading="loading" />
  </div>

  <VaModal
    v-model="newScopeModal"
    title="Create New Scope"
    close-button
    fixed-layout
    hide-default-actions
  >
    <NewScope
      @created="
        newScopeModal = false;
        fetchScopes();
      "
    />
  </VaModal>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
const scopes = ref([]);
const loading = ref(false);

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
];
const newScopeModal = ref(false);

function fetchScopes() {
  loading.value = true;
  apiKeyService
    .getAllScopes()
    .then((res) => {
      scopes.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleNewScope() {
  newScopeModal.value = true;
}

onMounted(fetchScopes);
</script>

<route lang="yaml">
meta:
  title: Scopes
  requiresRoles: ["admin"]
  nav: [{ label: "Scopes" }]
</route>
