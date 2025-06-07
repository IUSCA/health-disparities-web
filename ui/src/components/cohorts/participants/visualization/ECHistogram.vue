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
      data: props.data.map((bin) => {
        if (bin.bin_start && bin.bin_end) {
          return `${bin.bin_start}-${bin.bin_end}`;
        } else if (bin.bin_start) {
          return `${bin.bin_start}`;
        } else if (bin.bin_end) {
          return `${bin.bin_end}`;
        } else {
          return "";
        }
      }),
      nameRotate: 45,
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
      data: props.data.map((bin) => bin.bin_count),
    },
  ],
}));
</script>
