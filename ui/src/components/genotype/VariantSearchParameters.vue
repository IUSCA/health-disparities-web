<template>
  <div class="flex items-center gap-2 w-full text-sm">
    <VaChip class="flex-none" v-if="variantsStore.searchParams.length > 0">
      Search Parameters
    </VaChip>
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
