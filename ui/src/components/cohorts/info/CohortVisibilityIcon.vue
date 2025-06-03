<template>
  <VaPopover :message="props.visibility" v-if="props.visibility">
    <i-mdi-visibility
      class="va-text-secondary text-sm"
      v-if="props.visibility === CV.PUBLIC"
    />
    <i-mdi-visibility-off
      class="va-text-secondary text-sm"
      v-else-if="props.visibility === CV.PRIVATE"
    />
    <i-mdi-link-variant
      class="va-text-secondary text-sm"
      v-else-if="props.visibility === CV.UNLISTED"
    />
  </VaPopover>
</template>

<script setup>
import { CV } from "@/components/cohorts/models/index";
const props = defineProps({
  visibility: {
    type: String,
    required: true,
  },
});
</script>
