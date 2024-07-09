<template>
  <div>{{ props.category }}</div>
</template>

<script setup>
const props = defineProps({
  category: String,
});
</script>
