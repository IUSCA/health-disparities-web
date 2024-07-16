<template>
  <div v-html="highlightedContent"></div>
</template>

<script setup>
const props = defineProps({
  content: String,
  keyword: String,
});

const highlightedContent = computed(() => {
  const regex = new RegExp(`(${props.keyword})`, "gi");
  return props.content.replace(
    regex,
    '<span style="background-color: var(--va-text-highlighted);">$1</span>',
  );
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
