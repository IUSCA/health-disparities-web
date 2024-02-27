<template>
  <div>
    <div class="flex justify-start items-center text-lg mb-1">
      <i-mdi-account-group class="text-2xl" :style="{ color: props.color }" />
      <div class="ml-2">{{ name }}</div>
    </div>
    <div>
      <span class="font-semibold"> {{ props.count }} </span>
      <span> of {{ props.totalCount }} participants </span>
    </div>
    <CohortActions class="mt-3" />
  </div>
</template>

<script setup>
const props = defineProps({
  name: String,
  count: Number,
  totalCount: Number,
  color: {
    type: String,
    default: "rgb(0, 150, 255)",
  },
});
</script>
