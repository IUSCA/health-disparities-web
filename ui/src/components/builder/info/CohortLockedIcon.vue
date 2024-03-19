<template>
  <div :title="props.is_locked ? 'Locked' : 'Unlocked'">
    <i-mdi-lock
      class="va-text-secondary ml-2 text-sm"
      v-if="props.is_locked"
      title="locked"
    />
    <i-mdi-lock-open-variant
      class="va-text-secondary ml-2 text-sm"
      v-else
      title="unlocked"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  is_locked: {
    type: Boolean,
    required: true,
  },
});
</script>
