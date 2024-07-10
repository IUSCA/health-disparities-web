<template>
  <VChart
    class="chart"
    :option="option"
    autoresize
    :theme="isDark ? 'dark' : null"
    @click="handleClick"
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
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

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
    type: Array,
    required: true,
  },
  title: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  labelWidth: {
    type: Number,
    required: false,
    default: 150,
  },
});

const isDark = useDark();

const number_formatter = Intl.NumberFormat("en", { notation: "compact" });

const option = computed(() => {
  const labels = props.data.map((item) => item.label);
  const values = props.data.map((item) => item.value);

  return {
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
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      position: "bottom",
      // splitLine: {
      //   lineStyle: {
      //     type: "dashed",
      //   },
      // },
      axisLabel: {
        rotate: 45, // Rotate the labels by 45 degrees
        formatter: function (value) {
          // Format the labels as numbers with k, M, B, etc.
          return number_formatter.format(value);
        },
      },
    },
    yAxis: {
      type: "category",
      axisLine: { show: false },
      axisLabel: {
        overflow: "truncate",
        width: props.labelWidth,
        fontSize: 12,
      },
      axisTick: { show: false },
      splitLine: { show: false },
      data: labels,
    },
    series: [
      {
        name: props.name,
        type: "bar",
        label: {
          show: true,
          position: "inside",
          // formatter: "{b}",
          fontSize: 12,
        },
        data: values,
      },
    ],
  };
});

function handleClick(params) {
  console.log(params.name);
}
</script>
