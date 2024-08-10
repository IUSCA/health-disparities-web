<template>
  <div class="flex flex-row flex-wrap gap-2 items-center p-2">
    <VaButton
      v-for="id in props.recentFilters"
      :key="id"
      size="small"
      icon="history"
      :color="colors.backgroundBorder"
      round
      class="py-[0.0625rem] px-[0.25rem]"
      @click="emit('select', { id })"
    >
      <p class="font-normal pl-1">
        <FilterText
          v-bind="getFilterDetailsById({ filters: props.filters, id })"
        />
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

const { colors } = useColors();
</script>
