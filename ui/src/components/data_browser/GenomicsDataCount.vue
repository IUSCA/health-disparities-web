<template>
  <div>
    <div>
      <VaSkeleton variant="rounded" inline height="32px" v-if="loading" />
      <p v-else>
        <span class="text-4xl font-semibold text-[var(--va-primary)]">
          {{ number_formatter.format(counts.total) }}
        </span>
        <span class="pl-5"> variants </span>
      </p>
    </div>

    <div class="mt-2">
      <VaSkeleton
        variant="rounded"
        inline
        width="64px"
        height="32px"
        v-if="loading"
      />
      <p v-else>
        <span class="text-2xl font-semibold text-[var(--va-info)]">
          {{ number_formatter.format(counts.participants) }}
        </span>
        <span class="pl-5"> participants </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import dataBrowserService from "@/services/data_browser";

const props = defineProps({});

const number_formatter = Intl.NumberFormat("en");

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
