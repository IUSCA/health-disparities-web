<template>
  <VChart :option="option" autoresize :theme="isDark ? 'dark' : null" />
</template>

<script setup>
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
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
  name: {
    type: String,
    required: true,
  },
  colorIdx: {
    type: Number,
    default: 0,
  },
});

const colors = [
  "#5470c6",
  "#91cc75",
  "#fac858",
  "#ee6666",
  "#73c0de",
  "#3ba272",
  "#fc8452",
  "#9a60b4",
  "#ea7ccc",
];

const isDark = useDark();

const y_names = [
  { label: "Intercept", key: "intercept" },
  { label: "Hispanic", key: "Hispanic" },
  { label: "Black", key: "Black" },
  { label: "Num. Encounters", key: "num_encounters" },
  { label: "Gender", key: "gender" },
  { label: "Age", key: "age" },
];

const option = computed(() => ({
  title: {
    text: props.title,
    left: "center",
    top: "2%",
    textStyle: {
      fontSize: 16,
      fontWeight: "bold",
    },
  },
  grid: {
    top: "12%",
    left: "16%",
    right: "4%",
    bottom: "12%",
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
    },
  },
  xAxis: {
    type: "value",
    position: "top",
    splitLine: {
      lineStyle: {
        type: "dashed",
      },
    },
  },
  yAxis: {
    type: "category",
    name: "Variables",
    nameLocation: "middle",
    nameGap: 110,
    nameTextStyle: {
      fontSize: 12,
      fontWeight: "bold",
    },
    axisLine: { show: false },
    axisLabel: { show: true },
    axisTick: { show: false },
    splitLine: { show: false },
    data: y_names.map((name) => name.label),
  },
  series: [
    {
      name: props.name,
      type: "bar",
      label: {
        show: false, // labels near bars
        formatter: "{b}",
      },
      data: y_names
        .map(({ key }) => props.data[key])
        .map((val) => ({
          value: val.toFixed(3),
          label: {
            position: val > 0 ? "left" : "right",
          },
          itemStyle: {
            color: colors[props.colorIdx],
          },
        })),
    },
  ],
}));
</script>
