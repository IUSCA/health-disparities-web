<template>
  <VChart
    class="chart"
    :option="option"
    autoresize
    :theme="isDark ? 'dark' : null"
  />
</template>

<script setup>
import { PieChart } from "echarts/charts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

use([CanvasRenderer, PieChart]);

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  topN: {
    type: Number,
    default: Infinity,
  },
});

const isDark = useDark();

const data = computed(() => {
  const all_date = Object.entries(props.data)
    .sort(([_name, value]) => value) // sort by value descending
    .map(([name, value]) => ({
      name,
      value,
    }));
  const topN = all_date.slice(0, props.topN);

  if (topN.length === all_date.length) {
    return topN;
  }

  const othersValue = all_date
    .slice(props.topN)
    .reduce((acc, { value }) => acc + value, 0);
  console.log(topN, { name: "Others", value: othersValue });
  return [...topN, { name: "Others", value: othersValue }];
});

const option = computed(() => ({
  title: {
    text: props.title,
    left: "center",
  },
  tooltip: {
    trigger: "item",
  },

  series: [
    {
      name: "Count",
      type: "pie",
      radius: "50%",
      data: data.value,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
        },
      },
    },
  ],
}));
</script>
