<template>
  <p class="text-xl font-semibold my-1 text-center">Top 10 Terms</p>
  <div>
    <TopNHorizontalBarChart
      class="h-[300px]"
      :data="counts"
      title=""
      name="# participants"
      :label-width="300"
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
      counts.value = (res.data?.results || [])
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
