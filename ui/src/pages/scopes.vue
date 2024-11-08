<template>
  <div>
    <VaDataTable :items="scopes" :columns="columns" />
  </div>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
const scopes = ref([]);

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

apiKeyService
  .getAllScopes()
  .then((res) => {
    scopes.value = res.data;
  })
  .catch((err) => {
    console.error(err);
  });
</script>

<route lang="yaml">
meta:
  title: Scopes
  requiresRoles: ["admin"]
  nav: [{ label: "Scopes" }]
</route>
