<template>
  <VaInnerLoading :loading="loading">
    <div v-if="accessKey">
      <p><strong>Key:</strong> {{ accessKey.key }}</p>
      <p>
        <strong>Created At:</strong>
        {{ datetime.absolute(accessKey.created_at) }}
      </p>
      <p>
        <strong>Expires At:</strong>
        {{ datetime.absolute(accessKey.expires_at) }}
      </p>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import accessKeyService from "@/services/access_keys";
import * as datetime from "@/services/datetime";

const props = defineProps({
  _key: String,
});
const loading = ref(false);
const accessKey = ref(null);

onMounted(() => {
  loading.value = true;
  accessKeyService
    .getKey(props._key)
    .then((k) => {
      accessKey.value = k;
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>
