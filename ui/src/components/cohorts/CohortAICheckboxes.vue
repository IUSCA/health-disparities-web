<template>
  <div class="relative">
    <VaButtonDropdown
      preset="plain"
      class="absolute right-0 top-[-35px]"
      :offset="[0, -130]"
      :close-on-content-click="false"
      color="info"
    >
      <template #label>
        <i-mdi-sparkles class="text-lg icon" />
      </template>
      <div class="flex flex-col gap-3">
        <VaCheckbox
          v-model="enableTitleGeneration"
          class=""
          label="Generate Cohort title and description using AI"
        />
        <VaCheckbox
          v-model="enableChatbot"
          class=""
          label="Chat with an AI to create cohorts"
        />
      </div>
    </VaButtonDropdown>
  </div>
</template>

<script setup>
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
const cohortsStore = useCohortsStore();

const { enableTitleGeneration, enableChatbot } = storeToRefs(cohortsStore);
</script>
