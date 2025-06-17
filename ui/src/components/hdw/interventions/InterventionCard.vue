<template>
  <div
    role="button"
    @click="emits('select', props.intervention)"
    @keydown.enter="emits('select', props.intervention)"
    tabindex="0"
    :class="[
      'p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-300 dark:hover:bg-gray-800 border  border-solid',
      props.isSelected
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 shadow-md'
        : 'border-gray-200 dark:border-gray-700',
    ]"
  >
    <!-- removed class transform scale-[1.02] when selected because the border gets clipped-->
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2"
    >
      <div class="flex flex-col gap-1">
        <h3 class="capitalize text-sm sm:text-base truncate">
          {{ props.intervention.name }}
        </h3>
        <span
          v-if="props.intervention.category"
          class="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 w-fit"
        >
          {{ props.intervention.category }}
        </span>
      </div>
      <span class="text-xs sm:text-sm va-text-secondary whitespace-nowrap">
        Concepts: {{ props.intervention.concept_count }}
      </span>
    </div>
    <p
      class="text-xs sm:text-sm va-text-secondary mb-2 break-words max-h-[5rem] overflow-y-auto"
    >
      {{ props.intervention.description || "No description" }}
    </p>
    <div class="text-xs sm:text-sm va-text-secondary">
      Created: {{ formatDate(props.intervention.created_at) }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  intervention: {
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
