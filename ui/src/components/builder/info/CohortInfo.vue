<template>
  <div>
    <div class="flex justify-start items-center mb-1">
      <!-- <div class="flex-none">
        <i-mdi-account-group
          class="text-2xl"
          :style="{
            color: stringToRGB(`${props.cohort.id}-${props.cohort.name}`),
          }"
        />
      </div> -->
      <div
        class="text-lg leading-5 whitespace-nowrap overflow-clip overflow-ellipsis"
      >
        {{ props.cohort.name }}
      </div>
      <div class="flex ml-auto">
        <!-- published / unpublished -->
        <CohortPublishedIcon :is_published="props.cohort.is_published" />

        <!-- locked / unlocked -->
        <CohortLockedIcon :is_locked="props.cohort.is_locked" />
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
// import { stringToRGB } from "@/services/colors";

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
