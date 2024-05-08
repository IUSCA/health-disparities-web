<template>
  <div class="flex flex-wrap items-center gap-2 w-full text-sm">
    <div class="flex-none" v-if="variantsStore.searchParams.length > 1">
      <VaPopover>
        <template #body>
          <p class="max-w-sm">
            This search is performed using OR logic. Results will include
            variants that match any of the selected search parameters.
          </p>
        </template>
        <VaChip icon="info">
          <span> Inclusive Search </span>
        </VaChip>
      </VaPopover>
    </div>

    <div v-else>
      <VaChip v-if="variantsStore.searchParams.length > 0">
        <span> Search </span>
      </VaChip>
    </div>

    <VaChip
      v-for="(param, idx) in variantsStore.searchParams"
      :key="idx"
      class="flex-none"
      closeable
      outline
      @update:modelValue="variantsStore.removeSearchParam(param)"
    >
      <span class="font-semibold pr-1 capitalize"> {{ param.type }}: </span>
      <span> {{ param.text }} </span>
    </VaChip>
  </div>
</template>

<script setup>
import { useVariantsStore } from "@/stores/variants";
// const props = defineProps({});

const variantsStore = useVariantsStore();
</script>
