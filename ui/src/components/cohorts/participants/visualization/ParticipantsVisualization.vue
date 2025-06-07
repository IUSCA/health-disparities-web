<template>
  <div class="flex flex-wrap gap-3 items-center justify-start">
    <VaCard v-for="[key, graph] in graphList" :key="key" class="ec-graph-card">
      <VaCardContent>
        <div class="h-[300px] w-[300px]">
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
import participantsService from "@/services/participants";
import ECDateHistogram from "./ECDateHistogram.vue";
import ECHistogram from "./ECHistogram.vue";
import ECPie from "./ECPie.vue";

const props = defineProps({
  cohortId: { type: String, required: true },
  lastUpdated: { type: Number },
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
  dates: {
    // dob: {
    //   data: ref([]),
    //   title: "Date of Birth",
    // },
    max_enc_date: {
      data: ref([]),
      title: "Max Enc. Date",
      component: ECDateHistogram,
    },
    enroll_date: {
      data: ref([]),
      title: "Enrollment Date",
      component: ECDateHistogram,
    },
  },
};
// const cohort_id = "c0fab846-37aa-430f-ade6-1cb0201b6d1a";

const graphList = computed(() => {
  return Object.values(graphs)
    .map((graphCollection) => {
      return Object.entries(graphCollection);
    })
    .flat();
});

function fetchVizData() {
  Object.keys(graphs.categoricals).map((field) => {
    return participantsService
      .aggregate({ cohort_id: props.cohortId, field })
      .then((res) => {
        graphs.categoricals[field].data.value = res.data;
      });
  });

  Object.keys(graphs.numericals)
    .filter((field) => field !== "age")
    .map((field) => {
      return participantsService
        .bins({ cohort_id: props.cohortId, field, bins: 10 })
        .then((res) => {
          graphs.numericals[field].data.value = res.data;
        });
    });

  if (graphs.numericals.age) {
    participantsService.ageBins(props.cohortId).then((res) => {
      graphs.numericals.age.data.value = res.data;
    });
  }

  Object.keys(graphs.dates).map((field) => {
    return participantsService
      .dateBins({ cohort_id: props.cohortId, field, bins: 10 })
      .then((res) => {
        graphs.dates[field].data.value = res.data;
      });
  });
}

watch(
  [() => props.cohortId, () => props.lastUpdated],
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
