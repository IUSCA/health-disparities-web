<template>
  <div class="flex flex-wrap">
    <div class="w-1/2">
      <VaRadio
        v-model="model"
        type="radio"
        :options="Object.values(combinations)"
        value-by="key"
        text-by="label"
        vertical
      >
        <template #default="{ index, text }">
          <Icon
            :icon="combinationsList[index].icon"
            class="text-2xl va-text-secondary"
          />
          <span class="ml-3"> {{ text }} </span>
        </template>
      </VaRadio>
    </div>
    <div class="w-1/2">
      <span class="text-center"> {{ combinations[model].description }} </span>
    </div>
  </div>
</template>

<script setup>
import { combinations } from "./constants";

// const props = defineProps({});
const model = defineModel();
const combinationsList = Object.values(combinations);
</script>
./constants
