<template>
  <div>
    <VaPopover
      v-if="props.lastUsedAt"
      :message="`Last used at: ${datetime.absolute(props.lastUsedAt)}`"
    >
      <span v-if="props.showLabel">Last Used: </span>
      <span>{{ datetime.fromNow(props.lastUsedAt) }}</span>
    </VaPopover>
    <span v-else> Never Used </span>
  </div>
</template>

<script setup>
import * as datetime from "@/services/datetime";
const props = defineProps({
  lastUsedAt: {
    type: [String, null],
    required: true,
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
});
</script>
