<template>
  <VChart
    class="chart"
    :option="option"
    autoresize
    :theme="isDark ? 'dark' : null"
  />
</template>

<script setup>
import { BarChart } from "echarts/charts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

use([CanvasRenderer, BarChart]);

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
});

const isDark = useDark();

const option = computed(() => ({
  title: {
    text: props.title,
    left: "center",
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: [
    {
      type: "category",
      data: props.data.map((bin) => bin.label),
      axisTick: {
        alignWithLabel: true,
      },
    },
  ],
  yAxis: [
    {
      type: "value",
    },
  ],
  series: [
    {
      name: "Count",
      type: "bar",
      barWidth: "60%",
      data: props.data.map((bin) => bin.count),
    },
  ],
}));
</script>
