<template>
  <div v-if="isSupported" class="flex items-center justify-center">
    <va-popover
      :message="copied ? 'Copied' : 'Copy'"
      :hover-over-timeout="500"
      class="flex-none"
      placement="right"
    >
      <va-button @click="handleCopy" :preset="props.preset" :size="props.size">
        <i-mdi-check-bold
          v-if="copied"
          style="color: var(--va-success)"
          key="check"
          class="icon"
        />
        <i-mdi-content-copy
          v-else
          style="color: var(--va-primary)"
          class="hover:brightness-200 icon"
          key="copy"
        />
      </va-button>
    </va-popover>
  </div>
  <div v-else>
    <va-popover message="Copy is not supported in this browser">
      <va-button :preset="props.preset" disabled>
        <i-mdi-content-copy style="color: var(--va-disabled)" />
      </va-button>
    </va-popover>
  </div>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  preset: {
    type: String,
    default: "primary",
  },
  size: {
    type: String,
    default: "small",
  },
});
const emit = defineEmits(["textCopied"]);

const { copy, copied, isSupported } = useClipboard({
  copiedDuring: 3000,
});

function handleCopy() {
  copy(props.text);
  // Emit an event to allow parent to react to the copy-text action
  emit("textCopied");
}
</script>
