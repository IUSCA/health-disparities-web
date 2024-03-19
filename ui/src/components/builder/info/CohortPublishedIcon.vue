<template>
  <div :title="props.is_published ? 'Published' : 'Unpublished'">
    <i-mdi-visibility
      class="va-text-secondary ml-2 text-sm"
      v-if="props.is_published"
      title="publsihed"
    />
    <i-mdi-visibility-off
      class="va-text-secondary ml-2 text-sm"
      v-else
      title="unpublished"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  is_published: {
    type: Boolean,
    required: true,
  },
});
</script>
