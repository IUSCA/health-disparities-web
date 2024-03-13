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
    >
      Remove
    </va-button>
  </div>
  <CohortSaveModal
    ref="saveModal"
    :cohort="props.cohort"
    @save="(cohort) => emit('save', cohort)"
  />
</template>

<script setup>
import { isQueryEmpty } from "@/components/builder/queryBuilder/cohortQueryBuilder";

const props = defineProps({
  cohort: Object,
});
const emit = defineEmits(["save", "export", "remove"]);
const saveModal = ref(null);

// disable save button when
// - cohort is not supported
// - canonical query is empty
const isSaveDisabled = computed(() => {
  return !props.cohort.is_supported || isQueryEmpty(props.cohort.query);
});
</script>
../queryBuilder/cohortQueryBuilder
