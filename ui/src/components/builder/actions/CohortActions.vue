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

    <VaButton
      color="primary"
      @click="emit('copy')"
      preset="primary"
      icon="content_copy"
      size="small"
      round
      :border-color="isCopyDisabled ? null : 'primary'"
      :disabled="isCopyDisabled"
    >
      Copy
    </VaButton>

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
    @saved="emit('saved')"
  />
</template>

<script setup>
import { Cohort, CombinationCohort } from "@/components/builder/models";
import { PhenotypeCohort } from "@/components/builder/models/phenotype";
const props = defineProps({
  cohort: Cohort,
  hideRemove: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["saved", "export", "remove", "copy"]);
const saveModal = ref(null);

// do not save cohorts with empty queries
// disable save button when cohort is published
// - if user cannot edit the cohort (todo)
const isSaveDisabled = computed(() => {
  return props.cohort.isEmpty() || props.cohort.is_published;
});

// disable copy button when cohort is empty
// or if cohort is not a combination or phenotype cohort
// or if this cohort was never saved
const isCopyDisabled = computed(() => {
  return (
    !(
      props.cohort instanceof CombinationCohort ||
      props.cohort instanceof PhenotypeCohort
    ) ||
    props.cohort.isEmpty() ||
    props.cohort.isNew()
  );
});
</script>
