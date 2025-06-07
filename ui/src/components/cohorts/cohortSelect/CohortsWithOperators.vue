<template>
  <!-- array of cohorts -->
  <div
    v-for="(cohort, idx) in props.cohorts"
    :key="cohort.id"
    class="flex items-center"
  >
    <!-- Cohort details -->
    <div class="flex flex-nowrap items-start gap-2">
      <!-- icon -->
      <div>
        <i-mdi-account-group
          class="text-2xl"
          :style="{
            color: stringToRGB(`${cohort.id}-${cohort.name}`),
          }"
        />
      </div>
      <!-- details -->
      <div>
        <div
          class="font-semibold leading-4 max-w-[144px] whitespace-nowrap overflow-clip overflow-ellipsis"
          :title="cohort.getDisplayName()"
        >
          {{ cohort.getDisplayName() }}
        </div>
        <div class="text-sm va-text-secondary w-[72px]">
          <CohortSize :cohort="cohort" class="font-semibold" />
          <span> pax. </span>
        </div>
      </div>
    </div>

    <!-- combination logic -->
    <div v-if="idx < props.logicalOperators.length" class="mx-3">
      <va-button
        @click="emit('updateLogicalOperator', idx)"
        :title="combinations[props.logicalOperators[idx]].label"
        preset="secondary"
        color="secondary"
        size="small"
        :disabled="props.readonly"
      >
        <Icon
          :icon="combinations[props.logicalOperators[idx]].icon"
          class="text-2xl"
        />
      </va-button>
    </div>
  </div>
</template>

<script setup>
import { combinations } from "@/components/cohorts/combination/constants";
import { stringToRGB } from "@/services/colors";
const props = defineProps({
  cohorts: {
    type: Array,
    required: true,
  },
  logicalOperators: {
    type: Array,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["updateLogicalOperator"]);
</script>
