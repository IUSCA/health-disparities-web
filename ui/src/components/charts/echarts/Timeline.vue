<script setup>

import { CustomChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { graphic, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { default as VChart } from "vue-echarts";

use([
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  GridComponent,
  CustomChart,
  CanvasRenderer,
]);

/*
The data should be in the following format:
overview: {
  category: [
    {
      label: "Label",
      startDate: "2021-01-01",
      endDate: "2021-01-02",
    },
  ],
}
*/
const { overview, birthDate, dateRange } = defineProps({
  overview: Object,
  birthDate: String,
  dateRange: Array
});

const emit = defineEmits(["update:dateRange"]);


const startDate = new Date(birthDate);
const endDate = Date.now();

const calculateDatePercentage = (currentDate) => {
  const startTime = startDate.getTime();
  const endTime = new Date(endDate).getTime();
  const currentTime = new Date(currentDate).getTime();

  if (currentTime < startTime ) {
    return 0; // or handle out-of-range dates as needed
  } else if (currentTime > endTime) {
    return 100; // or handle out-of-range dates as needed
  }

  const percentage = ((currentTime - startTime) / (endTime - startTime)) * 100;
  return percentage;
};

// Function to calculate date from a percentage within a date range
const calculateDateFromPercentage = (percentage) => {
  console.log(percentage)
  const startTime = startDate.getTime();
  const endTime = new Date(endDate).getTime();

  const timeFromStart = (percentage / 100) * (endTime - startTime);
  const calculatedDate = new Date(startTime + timeFromStart);

  return calculatedDate;
};



const colors = ref(["#7b9ce1", "#bd6d6c", "#75d874", "#e0bc78", "#b39ddb", "#ff935c", "#a9ff6c", "#d6b981", "#d689ff", "#ff6e73", "#a7e6e6", "#f8ff5c", "#c59cff", "#ff6e99", "#6effc5", "#ff7e6e", "#7e6eff", "#6eff7e"]);

const categories = computed(() => {
  if (Object.keys(overview).length === 0) return [];
  return Object.keys(overview).map(
    (category) => category[0].toLocaleUpperCase() + category.slice(1),
  );
});

const data = computedEager(() => {
  if (Object.keys(overview).length === 0) return [];
  let arr = [];

  let x = 0;

  // console.log(overview);

  for (const category of Object.keys(overview)) {
    for (const categoryData of overview[category]) {
      // console.log(category, categoryData, x);
      const startDate = new Date(categoryData.startDate).getTime();
      const endDate =
        "endDate" in categoryData && categoryData.endDate !== null
          ? new Date(categoryData.endDate).getTime()
          : startDate + 86400000 * 7 * 4;
      const duration = endDate - startDate;
      arr.push({
        name: categoryData.label,
        // value: [index, baseTime, (baseTime += duration), duration],
        value: [x, startDate, startDate + duration, duration],
        itemStyle: {
          normal: {
            color: colors.value[x],
          },
        },
      });
    }
    x = x + 1;
  }

  return arr;
});

const start = ref(calculateDatePercentage(dateRange[0]))
const end = ref(calculateDatePercentage(dateRange[1]))




const updateDateRange = (res) => { 
  if('batch' in res) {
    emit("update:dateRange", [calculateDateFromPercentage(res.batch[0].start), calculateDateFromPercentage(res.batch[0].end)]) 
    return
  }
  
  emit("update:dateRange", [calculateDateFromPercentage(res.start), calculateDateFromPercentage(res.end)]) 
}


const renderItem = (params, api) => {
  var categoryIndex = api.value(0);
  var start = api.coord([api.value(1), categoryIndex]);
  var end = api.coord([api.value(2), categoryIndex]);
  var height = api.size([0, 1])[1] * 0.6;
  var rectShape = graphic.clipRectByRect(
    {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height: height,
    },
    {
      x: params.coordSys.x,
      y: params.coordSys.y,
      width: params.coordSys.width,
      height: params.coordSys.height,
    },
  );

  // console.log(rectShape);
  return (
    rectShape && {
      type: "rect",
      transition: ["shape"],
      shape: rectShape,
      style: api.style(),
    }
  );
};

const chartOptions = ref({
  tooltip: {
    formatter: function (params) {
      return (
        params.name + ": " + new Date(params.value[1]).toLocaleDateString()
      );
    },
  },

  dataZoom: [
    {
      type: "slider",
      filterMode: "weakFilter",
      showDataShadow: false,
      top: 400,
      start: start,
      end: end,
    },
    {
      type: "inside",
      filterMode: "weakFilter",

    },
  ],
  grid: {
    height: 300,
    width: "85%",
  },
  xAxis: {
    min: new Date(birthDate).getTime(),
    max: endDate,
    scale: true,
    axisLabel: {
      formatter: function (val) {
        return new Date(val).toLocaleDateString();
      },
    },
  },
  yAxis: {
    data: categories,
  },
  series: [
    {
      type: "custom",
      renderItem: renderItem,
      itemStyle: {
        opacity: 0.8,
      },
      encode: {
        x: [1, 2],
        y: 0,
      },
      data: data,
    },
  ],
});
</script>

<template>
  <div class="h-[1200px]">
    <p class="text-center text-2xl font-bold">Timeline</p>
    <VChart
      v-if="data.length !== 0"
      class="chart"
      autoresize
      :option="chartOptions"
      @dataZoom="updateDateRange"
    />
  </div>
</template>
