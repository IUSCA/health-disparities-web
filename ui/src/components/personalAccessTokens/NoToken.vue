<template>
  <div class="flex justify-center">
    <div class="flex flex-col items-center max-w-2xl text-center">
      <!-- key icon -->
      <div>
        <i-mdi-key-outline class="text-3xl font-thin" />
      </div>

      <!-- heading -->
      <div class="text-2xl font-semibold mt-3">
        No personal access token created
      </div>

      <!-- description -->
      <div class="mt-2 va-text-secondary font-medium">
        Need an API token for scripts or testing? Generate a personal access
        token for quick access to the Biobank API.
      </div>

      <!-- Button to generate new token -->
      <div class="mt-5" v-if="config.apiKeys.generation.enabledInProfile">
        <VaButton
          class="ml-3"
          preset="primary"
          border-color="primary"
          @click="emit('generate-token')"
        >
          <span> Generate new token </span>
        </VaButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import config from "@/config";

// const props = defineProps({});
const emit = defineEmits(["generateToken"]);
</script>
