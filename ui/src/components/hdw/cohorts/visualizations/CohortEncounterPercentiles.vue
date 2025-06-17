<template>
  <div class="w-full flex items-center justify-between">
    <Percentile :data="props.data.emergency" title="Emergency Encounters" />
    <Percentile :data="props.data.inpatient" title="Inpatient Encounters" />
    <Percentile :data="props.data.outpatient" title="Outpatient Encounters" />
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});
</script>
