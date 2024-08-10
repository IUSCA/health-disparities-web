<template>
  <div v-if="props.category != null && props.filter != null" class="flex">
    <span class="text-xs"> {{ props.category.label }} </span>

    <i-mdi-chevron-right class="" />

    <span class="">
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
