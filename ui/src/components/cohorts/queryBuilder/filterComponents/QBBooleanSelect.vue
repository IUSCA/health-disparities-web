<template>
  <div>
    <VaSelect
      v-model="model"
      :options="options"
      text-by="text"
      value-by="value"
      track-by="value"
      placeholder="Select an option"
      class="text-sm cohort-builder-select w-full"
      :teleport="teleportOptions"
    >
    </VaSelect>
    <div ref="teleportOptions" class="custom-options"></div>
  </div>
</template>

<script setup>
const model = defineModel();

const options = ref([
  {
    text: "Yes",
    value: true,
  },
  {
    text: "No",
    value: false,
  },
]);
const teleportOptions = ref(null);
</script>

<style scoped lang="scss">
:deep(.cohort-builder-select) {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
}
// for options in dropdown. make the font smaller and let the height be determined by the content
// :deep(.custom-options) {
//   .va-select-option {
//     font-size: 0.75rem;
//     line-height: 1rem;
//     min-height: 1.75rem;
//     flex: none;
//   }
// }

// hide the count in the select input because using option-content slot shows the count in both the dropdown and the input
:deep(.va-input-wrapper__text .select-option-count) {
  display: none;
}
</style>
