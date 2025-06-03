<template>
  <div class="flex flex-row gap-3 justify-start">
    <!-- favorite -->
    <CohortFavoriteButton
      :cohort="props.cohort"
      v-if="!props.cohort.isNew()"
      class="flex-none"
      :key="props.cohort.id"
    />

    <!-- open save modal when clicked -->
    <va-button
      color="success"
      @click="emit('edit')"
      icon="save"
      preset="primary"
      size="small"
      :disabled="isSaveDisabled"
      :border-color="isSaveDisabled ? null : 'success'"
      round
      class="min-w-[55px]"
    >
      Save
    </va-button>

    <VaButton
      color="primary"
      @click="emit('copy')"
      preset="primary"
      icon="content_copy"
      size="small"
      round
      :border-color="isCopyDisabled ? null : 'primary'"
      :disabled="isCopyDisabled"
      class="min-w-[55px]"
    >
      Copy
    </VaButton>

    <!-- <va-button
      color="primary"
      @click="emit('export')"
      preset="primary"
      icon="download"
      size="small"
      round
      class="min-w-[62px]"
    >
      Export
    </va-button> -->

    <va-button
      color="danger"
      @click="emit('remove')"
      icon="close"
      preset="primary"
      size="small"
      class="ml-auto min-w-[62px]"
      v-if="!props.hideRemove"
    >
      Remove
    </va-button>
  </div>
</template>

<script setup>
import { Cohort } from "@/components/cohorts/models";
const props = defineProps({
  cohort: Cohort,
  hideRemove: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["edit", "export", "remove", "copy"]);

// do not save cohorts with empty queries
// disable save button when cohort is not updatable
const isSaveDisabled = computed(() => {
  return props.cohort.isSavingDisabled();
});

const isCopyDisabled = computed(() => {
  return props.cohort.isCopyingDisabled();
});
</script>
