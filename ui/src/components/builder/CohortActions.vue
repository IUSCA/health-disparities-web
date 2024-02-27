<template>
  <div class="flex flex-row gap-3 justify-start">
    <va-button
      color="success"
      @click="saveCohort"
      icon="save"
      preset="primary"
      size="small"
      disabled
    >
      Save
    </va-button>
    <va-button
      color="primary"
      @click="exportCohort"
      preset="primary"
      icon="download"
      size="small"
      disabled
    >
      Export
    </va-button>

    <va-button
      color="danger"
      @click="removeCohort"
      icon="close"
      preset="primary"
      size="small"
      class="ml-auto"
      disabled
    >
      Remove
    </va-button>
  </div>
</template>

<script setup>
// const props = defineProps({});

function saveCohort() {
  console.log("Save Cohort");
}

function exportCohort() {
  console.log("Export Cohort");
}

function removeCohort() {
  console.log("Remove Cohort");
}
</script>
