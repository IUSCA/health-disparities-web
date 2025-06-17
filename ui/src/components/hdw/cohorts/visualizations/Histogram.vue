<template>
  <VChart
    :option="option"
    autoresize
    style="height: 320px"
    :theme="isDark ? 'dark' : null"
  />
</template>

<script setup>
import { BarChart } from "echarts/charts";
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
  title: {
    type: String,
    required: true,
  },
});

const isDark = useDark();

const freq = computed(() => {
  // rename the last value as "5+"
  const _freq = props.data["Black"].freq;
  _freq[_freq.length - 1] = "5+";
  return _freq;
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
      type: "shadow",
    },
  },
  grid: {
    left: "7%",
    right: "4%",
    bottom: "7%",
    containLabel: true,
  },
  legend: {
    data: ["Black", "White", "Hispanic"],
    top: "10%",
  },
  xAxis: {
    name: "Encounters",
    nameLocation: "middle",
    nameGap: 24,
    type: "category",
    data: freq.value,
  },
  yAxis: {
    name: "Subjects",
    nameLocation: "middle",
    type: "value",
    nameGap: 55,
  },
  series: [
    {
      name: "Black",
      data: props.data["Black"].bins,
      type: "bar",
    },
    {
      name: "White",
      data: props.data["White"].bins,
      type: "bar",
    },
    {
      name: "Hispanic",
      data: props.data["Hispanic"].bins,
      type: "bar",
    },
  ],
};
</script>
