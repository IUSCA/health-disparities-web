<template>
  <div class="flex flex-wrap gap-3 items-center justify-start">
    <VaCard v-for="[key, graph] in graphList" :key="key" class="ec-graph-card">
      <VaCardContent>
        <div class="h-[256px] w-[256px]">
          <component
            :is="graph.component"
            :data="graph.data.value"
            :title="graph.title"
            v-bind="graph.props || {}"
          />
        </div>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup>
import ECHistogram from "@/components/cohorts/participants/visualization/ECHistogram.vue";
import ECPie from "@/components/cohorts/participants/visualization/ECPie.vue";
import dataBrowserService from "@/services/data_browser";

const props = defineProps({
  category: String,
  name: String,
});

// const data = { F: 27418, M: 19298, U: 12 };
const graphs = {
  categoricals: {
    gender: {
      data: ref([]),
      title: "Gender",
      component: ECPie,
    },
    ethnicity: {
      data: ref([]),
      title: "Ethnicity",
      component: ECPie,
    },
    race: {
      data: ref([]),
      title: "Race",
      component: ECPie,
      props: {
        topN: 5,
      },
    },
  },
  numericals: {
    age: {
      data: ref([]),
      title: "Age",
      component: ECHistogram,
    },
  },
};

const graphList = computed(() => {
  return Object.values(graphs)
    .map((graphCollection) => {
      return Object.entries(graphCollection);
    })
    .flat();
});

function fetchVizData() {
  if (!props.category || !props.name) return;

  Object.keys(graphs.categoricals).map((field) => {
    return dataBrowserService
      .getParticipantAggregate({
        category: props.category,
        name: props.name,
        field,
      })
      .then((res) => {
        graphs.categoricals[field].data.value = res.data;
      });
  });

  Object.keys(graphs.numericals).map((field) => {
    return dataBrowserService
      .getParticipantAgeBins({
        category: props.category,
        name: props.name,
        bins: 10,
      })
      .then((res) => {
        graphs.numericals[field].data.value = res.data;
      });
  });
}

watch(
  () => [props.category, props.name],
  () => {
    fetchVizData();
  },
  {
    immediate: true,
  },
);
</script>

<style scoped>
.ec-graph-card {
  --va-card-padding: 0.1rem;
}
</style>
