<template>
  <VChart
    :option="option"
    autoresize
    style="height: 320px"
    :theme="isDark ? 'dark' : null"
  />
</template>

<script setup>
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { use } from "echarts/core";
import VChart from "vue-echarts";

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const isDark = useDark();

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
});

const option = {
  title: {
    text: props.title,
    left: "center",
    textStyle: {
      fontSize: 14,
    },
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
    },
  },
  legend: {
    data: ["Black", "White", "Hispanic"],
    top: "10%",
  },
  grid: {
    left: "7%",
    right: "4%",
    bottom: "8%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    name: "Percentiles",
    nameLocation: "middle",
    nameGap: 25, // Gap between axis name and axis line
    data: props.data["Black"].percentiles,
  },
  yAxis: {
    type: "value",
    name: "Encounters",
    nameLocation: "middle",
    nameGap: 27, // Gap between axis name and axis line
  },
  series: [
    {
      name: "Black",
      data: props.data["Black"].num_encounters.map((x) => Math.round(x)),
      type: "line",
      showSymbol: false,
    },
    {
      name: "White",
      data: props.data["White"].num_encounters.map((x) => Math.round(x)),
      type: "line",
      showSymbol: false,
    },
    {
      name: "Hispanic",
      data: props.data["Hispanic"].num_encounters.map((x) => Math.round(x)),
      type: "line",
      showSymbol: false,
    },
  ],
};
</script>
