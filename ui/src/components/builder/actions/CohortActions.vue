<template>
  <div class="flex flex-row gap-3 justify-start">
    <!-- open save modal when clicked -->
    <va-button
      color="success"
      @click="saveModal.show()"
      icon="save"
      preset="primary"
      size="small"
      :disabled="isSaveDisabled"
      :border-color="isSaveDisabled ? null : 'success'"
      round
    >
      Save
    </va-button>
    <va-button
      color="primary"
      @click="emit('export')"
      preset="primary"
      icon="download"
      size="small"
      disabled
      round
    >
      Export
    </va-button>

    <va-button
      color="danger"
      @click="emit('remove')"
      icon="close"
      preset="primary"
      size="small"
      class="ml-auto"
      v-if="!props.hideRemove"
    >
      Remove
    </va-button>
  </div>
  <CohortSaveModal
    ref="saveModal"
    :cohort="props.cohort"
    @save="emit('save')"
  />
</template>

<script setup>
import { Cohort } from "@/components/builder/models";
const props = defineProps({
  cohort: Cohort,
  hideRemove: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["save", "export", "remove"]);
const saveModal = ref(null);

// do not save cohorts with empty queries
// disable save button when cohort is published
// - if user cannot edit the cohort (todo)
const isSaveDisabled = computed(() => {
  return (
    props.cohort.isEmpty() ||
    props.cohort.is_published ||
    !props.cohort.is_dirty
  );
});
</script>
