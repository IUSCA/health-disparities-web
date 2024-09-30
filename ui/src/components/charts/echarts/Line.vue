<script setup>
import { LineChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

use([GridComponent, LineChart, CanvasRenderer]);

const { title, xData, yData } = defineProps({
  title: String,
  xData: Array,
  yData: Array,
});

const chartOptions = ref({
  xAxis: {
    type: "category",
    data: xData,
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      data: yData,
      type: "line",
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
