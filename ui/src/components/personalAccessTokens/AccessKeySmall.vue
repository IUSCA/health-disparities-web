<template>
  <VaInnerLoading :loading="loading">
    <div v-if="apiKey">
      <p><strong>Key:</strong> {{ apiKey.key }}</p>
      <p>
        <strong>Created At:</strong>
        {{ datetime.absolute(apiKey.created_at) }}
      </p>
      <p>
        <strong>Expires At:</strong>
        {{ datetime.absolute(apiKey.expires_at) }}
      </p>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
import * as datetime from "@/services/datetime";

const props = defineProps({
  _key: String,
});
const loading = ref(false);
const apiKey = ref(null);

onMounted(() => {
  loading.value = true;
  apiKeyService
    .getKey(props._key)
    .then((k) => {
      apiKey.value = k;
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>
