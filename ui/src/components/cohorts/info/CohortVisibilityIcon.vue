<template>
  <VaPopover :message="props.visibility" v-if="props.visibility">
    <i-mdi-visibility
      class="va-text-secondary text-sm"
      v-if="props.visibility === 'PUBLIC'"
      title="Published"
    />
    <i-mdi-visibility-off
      class="va-text-secondary text-sm"
      v-else-if="props.visibility === 'PRIVATE'"
      title="unpublished"
    />
    <i-mdi-link-variant
      class="va-text-secondary text-sm"
      v-else-if="props.visibility === 'UNLISTED'"
      title="Locked"
    />
  </VaPopover>
</template>

<script setup>
const props = defineProps({
  visibility: {
    type: String,
    required: true,
  },
});
</script>
