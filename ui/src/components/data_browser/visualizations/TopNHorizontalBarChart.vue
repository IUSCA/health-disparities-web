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
    required: true,
  },
  name: {
    type: String,
    required: true,
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
      left: "3%",
      right: "4%",
      bottom: "3%",
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
        width: 150,
        fontSize: 11,
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
          fontSize: 11,
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
