<template>
  <CountCardContent
    :title="props.title"
    :icon="props.icon"
    :loading="loading"
    :total="total_count"
    :units="props.units"
  />
</template>

<script setup>
import dataBrowserService from "@/services/data_browser";

const props = defineProps({
  source: String,
  title: String,
  icon: String,
  units: String,
});

const total_count = ref(0);
const loading = ref(false);

watch(() => props.keyword, getCounts);

function getCounts() {
  loading.value = true;
  dataBrowserService
    .getAnnotationCounts({
      source: props.source,
    })
    .then((res) => {
      total_count.value = res.data.count;
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  getCounts();
});
</script>
