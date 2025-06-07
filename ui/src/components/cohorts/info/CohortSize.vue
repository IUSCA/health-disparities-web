<template>
  <span>
    <!-- show less than symbol when cohort size is below deidentification threshold -->
    <!-- assuming cohort.size will be set as the min threshold -->
    <span v-if="props.cohort.is_below_min_cohort_size"> < </span>
    {{ props.cohort.size }}
  </span>
</template>

<script setup>
const props = defineProps({
  cohort: { type: Object, required: true },
});
</script>
