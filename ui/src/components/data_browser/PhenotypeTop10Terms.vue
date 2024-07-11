<template>
  <p class="text-xl font-semibold my-1 text-center">Top 10 Terms</p>
  <div>
    <TopNHorizontalBarChart
      class="h-[300px]"
      :data="counts"
      title=""
      name="# participants"
      :label-width="labelWidth"
    />
  </div>
</template>

<script setup>
import dataBrowserService from "@/services/data_browser";
import { useUIStore } from "@/stores/ui";

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

const ui = useUIStore();

const loading = ref(true);
const counts = ref([]);

const labelWidth = computed(() => {
  if (ui.isMobileView) {
    return 100;
  }
  return 300;
});

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
