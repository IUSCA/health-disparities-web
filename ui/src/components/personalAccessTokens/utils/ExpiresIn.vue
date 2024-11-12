<template>
  <VaPopover
    v-if="props.expiresAt"
    :message="`Expires at: ${datetime.absolute(props.expiresAt)}`"
  >
    <span v-if="props.showLabel">Expires in: </span>
    <span>{{
      maybePluralize(datetime.daysFromNow(props.expiresAt), "day")
    }}</span>
  </VaPopover>
</template>

<script setup>
import * as datetime from "@/services/datetime";
import { maybePluralize } from "@/services/utils";

const props = defineProps({
  expiresAt: {
    type: String,
    required: true,
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
});
</script>
