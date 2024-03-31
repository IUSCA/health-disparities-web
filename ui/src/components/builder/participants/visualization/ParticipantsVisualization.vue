<template>
  <div class="flex flex-wrap gap-3 items-center justify-start">
    <VaCard v-for="i in [1, 2, 3, 4]" :key="i" class="horizontal-bar">
      <VaCardContent>
        <div class="h-[300px] w-[300px]">
          <HorizontalBar :data="data" />
        </div>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup>
// const props = defineProps({})
const data = { F: 27418, M: 19298, U: 12 };
</script>

<style scoped>
.horizontal-bar {
  --va-card-padding: 0.25rem;
}
</style>
