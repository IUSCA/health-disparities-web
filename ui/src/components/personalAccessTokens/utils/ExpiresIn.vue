<template>
  <!-- 
    if expires in more than 1 days show `Expires in {} days`
    if expires today, show `Expires in {} hours`
    if expired, show `Expired` 
  -->
  <VaPopover
    v-if="props.expiresAt"
    :message="`Expires at: ${datetime.absolute(props.expiresAt)}`"
  >
    <span>{{ expiresInStr }}</span>
  </VaPopover>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
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

const expiresInStr = computed(() => {
  const days = datetime.daysFromNow(props.expiresAt);
  // if expires in more than 1 days show `Expires in {} days`
  if (days >= 1) {
    if (props.showLabel) {
      return `Expires in ${maybePluralize(days, "day")}`;
    } else {
      return `${maybePluralize(days, "day")}`;
    }
  }
  // if expired, show `Expired`
  if (apiKeyService.isExpired({ expires_at: props.expiresAt })) {
    return "Expired";
  }
  // if expires today, show `Expires in {} hours`
  if (props.showLabel) {
    `Expires in ${datetime.fromNow(props.expiresAt, true)}`;
  }
  return datetime.fromNow(props.expiresAt, true);
});
</script>
