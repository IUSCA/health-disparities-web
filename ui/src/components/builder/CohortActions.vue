<template>
  <div class="flex flex-col gap-3 justify-start">
    <va-button
      class="mr-2"
      color="black"
      @click="removeCohort"
      icon="close"
      preset="plain"
    />
    <va-button
      class="mr-2"
      color="success"
      @click="saveCohort"
      icon="save"
      preset="plain"
    />
    <va-button
      class="mr-2"
      color="primary"
      @click="exportCohort"
      preset="plain"
      icon="download"
    />
  </div>
</template>

<script setup>
const props = defineProps({});
</script>
