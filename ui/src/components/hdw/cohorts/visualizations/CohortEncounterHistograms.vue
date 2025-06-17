<template>
  <div class="w-full flex items-center justify-between">
    <Histogram :data="props.data.emergency" title="Emergency Encounters" />
    <Histogram :data="props.data.inpatient" title="Inpatient Encounters" />
    <Histogram :data="props.data.outpatient" title="Outpatient Encounters" />
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});
// const data = {
//   emergency: {
//     Black: {
//       bins: [7963, 3466, 1620, 903, 580, 1305],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//     Hispanic: {
//       bins: [950, 336, 169, 87, 43, 132],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//     White: {
//       bins: [30893, 9943, 4808, 2661, 1608, 3708],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//   },
//   inpatient: {
//     Black: {
//       bins: [10366, 3212, 1104, 484, 263, 408],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//     Hispanic: {
//       bins: [1018, 429, 136, 57, 37, 40],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//     White: {
//       bins: [28735, 13517, 5303, 2580, 1369, 2117],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//   },
//   outpatient: {
//     Black: {
//       bins: [1517, 1037, 958, 956, 868, 10501],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//     Hispanic: {
//       bins: [202, 158, 129, 108, 103, 1017],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//     White: {
//       bins: [4423, 3462, 3496, 3320, 2923, 35997],
//       freq: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],
//     },
//   },
// };
</script>
