<template>
  <div
    v-if="props.category != null && props.filter != null"
    class="flex items-center"
  >
    <span class="text-sm"> {{ props.category.label }} </span>

    <i-mdi-chevron-right class="" />

    <span class="text-sm">
      {{ props.filter.label }}
    </span>
  </div>
</template>

<script setup>
const props = defineProps({
  category: Object,
  filter: Object,
});
</script>
