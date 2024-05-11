<template>
  <VChart
    class="chart"
    :option="option"
    autoresize
    :theme="isDark ? 'dark' : null"
  />
</template>

<script setup>
import { BarChart, PieChart } from "echarts/charts";
import {
GridComponent,
LegendComponent,
TitleComponent,
TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const isDark = useDark();

const option = computed(() => ({
  xAxis: {
    type: "value",
  },
  yAxis: {
    type: "category",
    data: Object.keys(props.data),
    axisLine: { show: false },
    axisLabel: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
  },
  series: [
    {
      data: Object.values(props.data),
      type: "bar",
      label: {
        show: true,
        formatter: "{b}: {c}",
      },
    },
  ],
}));
</script>
