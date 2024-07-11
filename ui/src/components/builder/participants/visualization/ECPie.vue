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
  /**
   * Only show props.topN+1 items in the pie chart
   * Show the topN items and group the rest into "Others"
   *
   * props.data: {keyword1: count, keyword2: count, ...}
   */

  // sorted_data: [{name: keyword, value: count}, ...]
  const sorted_data = Object.entries(props.data)
    .sort((a, b) => b[1] - a[1]) // sort by value descending
    .map(([name, value]) => ({
      name,
      value,
    }));

  // if the number of items is less than topN, return all items
  if (sorted_data.length <= props.topN) {
    return sorted_data;
  }

  const topN = sorted_data.slice(0, props.topN);

  // sum the values of the rest of the items
  const othersValue = sorted_data
    .slice(props.topN)
    .reduce((acc, { value }) => acc + value, 0);

  // return topN items and "Others"
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
