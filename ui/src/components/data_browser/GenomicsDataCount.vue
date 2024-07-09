<template>
  <CountCardContent
    title="Variants"
    icon="mdi-dna"
    :loading="loading"
    :total="counts.total"
    :participants="counts.participants"
    units="variants"
  />
</template>

<script setup>
import dataBrowserService from "@/services/data_browser";

const props = defineProps({});

const counts = ref({
  total: 0,
  participants: 0,
});
const loading = ref(false);

watch(() => props.keyword, getCounts);

function getCounts() {
  loading.value = true;
  dataBrowserService
    .getGenomicDataCounts()
    .then((res) => {
      counts.value.total = res.data.total;
      counts.value.participants = res.data.participants;
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  getCounts();
});
</script>
