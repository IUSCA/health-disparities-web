<template>
  <div class="grid grid-cols-1 md:grid-cols-2">
    <div class="flex gap-1 md:gap-3">
      <span class="font-semibold">Gender:</span>
      <span>{{ demographics.gender }}</span>
    </div>
    <div class="flex gap-1 md:gap-3">
      <span class="font-semibold">Date of Birth:</span>
      <span>{{ datetime.date(demographics.dob) }}</span>
      <!-- age in years -->
      <span class=""> ({{ datetime.fromNow(demographics.dob, true) }}) </span>
    </div>

    <div class="flex gap-1 md:gap-3">
      <span class="font-semibold">Race:</span>
      <span>{{ demographics.race }}</span>
    </div>
    <div class="flex gap-1 md:gap-3">
      <span class="font-semibold">Ethnicity:</span>
      <span>{{ demographics.ethnicity }}</span>
    </div>

    <div class="flex gap-1 md:gap-3">
      <span class="font-semibold">Enroll Date:</span>
      <span>{{ datetime.date(demographics.enroll_date) }}</span>
    </div>
  </div>
</template>

<script setup>
import * as datetime from "@/services/datetime";
const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
});
const demographics = computed(() => {
  return props.data[0];
});
</script>
