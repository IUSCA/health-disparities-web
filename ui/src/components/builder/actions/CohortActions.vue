<template>
  <div class="flex flex-row gap-3 justify-start">
    <va-button
      color="success"
      @click="saveModal.show()"
      icon="save"
      preset="primary"
      size="small"
      :disabled="!props.cohort.is_supported || isQueryEmpty(props.cohort.query)"
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
</script>
../queryBuilder/cohortQueryBuilder
