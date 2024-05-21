<template>
  <div class="flex flex-wrap gap-3 items-center justify-start">
    <VaCard v-for="[key, graph] in graphList" :key="key" class="ecgraph-card">
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
import { Cohort } from "@/components/builder/models";
import cohortService from "@/services/cohort2";
import ECDateHistogram from "./ECDateHistogram.vue";
import ECHistogram from "./ECHistogram.vue";
import ECPie from "./ECPie.vue";

const props = defineProps({
  cohort: { type: Cohort, required: true },
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
  console.log(props.cohort.is_dirty, props.cohort.search_id, props.cohort.id);
  if (!props.cohort) return;
  const cohort_id = props.cohort.is_dirty
    ? props.cohort.search_id
    : props.cohort.id;
  console.log("fetchVizData cohort id", cohort_id);

  if (cohort_id && !props.cohort.isEmpty()) {
    Object.keys(graphs.categoricals).map((field) => {
      return cohortService
        .getParticipantAggregate({ id: cohort_id, field })
        .then((res) => {
          graphs.categoricals[field].data.value = res.data;
        });
    });

    Object.keys(graphs.numericals).map((field) => {
      return cohortService
        .getParticipantBins({ id: cohort_id, field, bins: 10 })
        .then((res) => {
          graphs.numericals[field].data.value = res.data;
        });
    });

    Object.keys(graphs.dates).map((field) => {
      return cohortService
        .getParticipantDateBins({ id: cohort_id, field, bins: 10 })
        .then((res) => {
          graphs.dates[field].data.value = res.data;
        });
    });
  }
}

watch(
  () => props.cohort,
  () => {
    fetchVizData();
  },
  {
    immediate: true,
    deep: true,
  },
);
</script>

<style scoped>
.ecgraph-card {
  --va-card-padding: 0.1rem;
}
</style>
