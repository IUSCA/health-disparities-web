<template>
  <div
    role="button"
    @click="emits('select', props.cohort)"
    @keydown.enter="emits('select', props.cohort)"
    tabindex="0"
    :class="[
      'p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-300 dark:hover:bg-gray-800 border border-solid',
      props.isSelected
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 shadow-md'
        : 'border-gray-200 dark:border-gray-700',
    ]"
  >
    <!-- removed class transform scale-[1.02] when selected because the border gets clipped-->
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2"
    >
      <h3 class="capitalize text-sm sm:text-base truncate">
        {{ props.cohort.name }}
      </h3>
      <span class="text-xs sm:text-sm va-text-secondary whitespace-nowrap"
        >Size: {{ props.cohort.size }}</span
      >
    </div>
    <p
      class="text-xs sm:text-sm va-text-secondary mb-2 break-words max-h-[5rem] overflow-y-auto"
    >
      {{ props.cohort.description || "No description" }}
    </p>
    <div class="text-xs sm:text-sm va-text-secondary">
      Created: {{ formatDate(props.cohort.created_at) }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  cohort: {
    type: Object,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
});
const emits = defineEmits(["select"]);

function formatDate(dateString) {
  return dateString;
}
</script>
