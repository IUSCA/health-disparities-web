<script setup>
import { PieChart } from "echarts/charts";
import {
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
]);

/*
This comoponent expect the data to be in the following format:
[
  { value: 1048, name: "Search Engine" },
  { value: 735, name: "Direct" },
  { value: 580, name: "Email" },
  { value: 484, name: "Union Ads" },
  { value: 300, name: "Video Ads" },
]
*/
const { data, title } = defineProps({
  data: Array,
  title: String,
});

const chartOptions = ref({
  tooltip: {
    trigger: "item",
  },

  series: [
    {
      name: "Number of",
      type: "pie",
      radius: "50%",
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
        },
      },
    },
  ],
});
</script>

<template>
  <div class="h-64">
    <p class="text-center text-2xl font-bold">{{ title }}</p>
    <VChart class="chart" autoresize :option="chartOptions" />
  </div>
</template>
