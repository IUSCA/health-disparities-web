<template>
  <div class="flex flex-row flex-wrap gap-2 items-center p-2">
    <VaButton
      v-for="fd in filterDetails"
      :key="fd.id"
      size="small"
      icon="history"
      :color="colors.backgroundBorder"
      round
      class="py-[0.0625rem] px-[0.25rem]"
      @click="emit('select', { id: fd.id })"
    >
      <p class="font-normal pl-1">
        <FilterText :category="fd.category" :filter="fd.filter" />
      </p>
    </VaButton>
  </div>
</template>

<script setup>
import { useColors } from "vuestic-ui";
import { getFilterDetailsById } from "./common";
const props = defineProps({
  filters: Object,
  recentFilters: Array,
});
const emit = defineEmits(["select"]);

const filterDetails = computed(() => {
  return props.recentFilters
    .map((id) => {
      try {
        const { category, filter } = getFilterDetailsById({
          filters: props.filters,
          id,
        });
        return {
          id,
          category,
          filter,
        };
      } catch (e) {
        console.error(e);
      }
    })
    .filter((x) => x);
});

const { colors } = useColors();
</script>
