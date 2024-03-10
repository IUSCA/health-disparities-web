<template>
  <div>
    <div class="flex justify-start items-center mb-1">
      <i-mdi-account-group
        class="text-2xl"
        :style="{
          color: stringToRGB(`${props.cohort.id}-${props.cohort.name}`),
        }"
      />
      <div class="ml-2 text-lg">{{ props.cohort.name }}</div>
      <div>
        <i-mdi-visibility
          class="va-text-secondary ml-2 text-sm"
          v-if="props.cohort.is_published"
          title="publsihed"
        />
        <i-mdi-visibility-off
          class="va-text-secondary ml-2 text-sm"
          v-else
          title="unpublished"
        />
      </div>
      <div>
        <i-mdi-lock
          class="va-text-secondary ml-2 text-sm"
          v-if="props.cohort.is_locked"
          title="locked"
        />
        <i-mdi-lock-open-variant
          class="va-text-secondary ml-2 text-sm"
          v-else
          title="unlocked"
        />
      </div>
    </div>
    <div class="va-text-secondary">
      <span class="font-semibold">
        <NumberTransition :target="props.cohort.size" :debounce="50" />
      </span>
      <span v-if="props.totalCount">
        of {{ number_formatter.format(props.totalCount) }}
      </span>
      <span> participants </span>
    </div>
  </div>
</template>

<script setup>
import { stringToRGB } from "@/services/colors";

const props = defineProps({
  cohort: Object,
  totalCount: Number,
});

const number_formatter = Intl.NumberFormat("en");

// onBeforeMount(() => {
//   console.log("CohortInfo", props);
// });
// onBeforeUnmount(() => {
//   console.log("CohortInfo unmount", props);
// });
</script>
