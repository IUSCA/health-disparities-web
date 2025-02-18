<template>
  <div class="flex justify-center">
    <div class="flex flex-col items-center max-w-2xl text-center">
      <!-- key icon -->
      <div>
        <i-mdi-key-outline class="text-3xl font-thin" />
      </div>

      <!-- heading -->
      <div class="text-2xl font-semibold mt-3">No access keys created</div>

      <!-- description -->
      <div class="mt-2 va-text-secondary font-medium">
        Need to access the API for scripts or data downloads? Create an Access
        Key for seamless integration with the Biobank API.
      </div>

      <!-- Button to generate new access key -->
      <div class="mt-5" v-if="config.accessKeys.generation.enabledInProfile">
        <VaButton
          class="ml-3"
          preset="primary"
          border-color="primary"
          @click="emit('generate-access-key')"
        >
          <span> Generate new access key </span>
        </VaButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import config from "@/config";

// const props = defineProps({});
const emit = defineEmits(["generate-access-key"]);
</script>
