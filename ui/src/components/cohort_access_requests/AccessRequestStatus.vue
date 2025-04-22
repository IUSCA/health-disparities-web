<template>
  <div class="flex items-center gap-1">
    <Icon
      v-if="props.showIcon"
      :icon="getIcon(props.request.status)"
      :class="getIconColor(props.request.status)"
    />
    <span> {{ props.request.status }} </span>

    <span
      v-if="
        props.showDecisionDate &&
        !requestService.isActive(props.request) &&
        props.request.decision_date
      "
      class="va-text-secondary text-sm ml-1"
    >
      on {{ datetime.date(props.request.decision_date) }}
    </span>
  </div>
</template>

<script setup>
import requestService from "@/services/cohort_access_requests";
import * as datetime from "@/services/datetime";

const props = defineProps({
  request: Object,
  showDecisionDate: {
    type: Boolean,
    default: false,
  },
  showIcon: {
    type: Boolean,
    default: true,
  },
});

function getIconColor(status) {
  const colors = {
    INITIATED: "text-blue-500 dark:text-blue-400",
    PENDING: "text-blue-500 dark:text-blue-400",
    APPROVED: "text-green-500 dark:text-green-400",
    REJECTED: "text-red-500 dark:text-red-400",
    CANCELED: "text-gray-500 dark:text-gray-400",
    EXPIRED: "text-purple-500 dark:text-purple-400",
  };
  return colors[status] || "text-gray-500 dark:text-gray-400";
}
function getIcon(status) {
  const icons = {
    INITIATED: "mdi-hourglass-empty",
    PENDING: "mdi-hourglass",
    APPROVED: "mdi-check-circle",
    REJECTED: "mdi-close-circle",
    CANCELED: "mdi-cancel",
    EXPIRED: "mdi-clock-alert",
  };
  return icons[status] || "mdi-help-circle";
}
</script>
