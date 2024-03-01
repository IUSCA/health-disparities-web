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
          class="va-text-secondary ml-2"
          v-if="props.cohort.published"
          title="publsihed"
        />
        <i-mdi-visibility-off
          class="va-text-secondary ml-2"
          v-else
          title="unpublished"
        />
      </div>
    </div>
    <div class="va-text-secondary">
      <span class="font-semibold">
        <NumberTransition :target="props.cohort.participants" :debounce="50" />
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

onBeforeMount(() => {
  console.log("CohortInfo", props);
});
onBeforeUnmount(() => {
  console.log("CohortInfo unmount", props);
});
</script>
