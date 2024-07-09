<template>
  <VaSkeleton variant="rounded" inline height="32px" v-if="loading" />
  <div v-else>
    <TopNHorizontalBarChart
      class="h-[400px] w-[400px]"
      :data="counts"
      title="Top 10 Terms"
      name="# participants"
    />
  </div>
</template>

<script setup>
import dataBrowserService from "@/services/data_browser";

const props = defineProps({
  keyword: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    required: true,
  },
});

const loading = ref(true);
const counts = ref([]);

watch(() => props.keyword, getCounts);

function getCounts() {
  loading.value = true;
  dataBrowserService
    .getParticipantCountsByName({
      category: props.category,
      keyword: props.keyword,
    })
    .then((res) => {
      counts.value = res.data
        .map(({ name, count }) => ({
          label: name,
          value: count,
        }))
        .reverse();
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  getCounts();
});
</script>
