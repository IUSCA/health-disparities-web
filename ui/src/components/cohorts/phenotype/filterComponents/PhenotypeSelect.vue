<template>
  <div class="flex-grow">
    <VaSelect
      v-model="model"
      :options="options"
      class="text-sm cohort-builder-select w-full"
      multiple
      :loading="loading"
      :max-visible-options="3"
      selected-top-shown
      searchable
      :highlight-matched-text="false"
      :teleport="teleportOptions"
    >
    </VaSelect>
    <div ref="teleportOptions" class="custom-options"></div>
  </div>
</template>

<script setup>
import cohortService from "@/services/cohort2";

const props = defineProps({
  identifier: String,
  separator: {
    type: String,
    default: ".",
  },
});
const model = defineModel();

const options = ref([]);
const loading = ref(false);
const teleportOptions = ref(null);

watch(
  () => props.identifier,
  () => {
    const [category, field] = props.identifier.split(props.separator);
    loading.value = true;
    cohortService
      .unique(category, field)
      .then((res) => {
        options.value = Object.keys(res.data);
      })
      .finally(() => {
        loading.value = false;
      });
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
:deep(.cohort-builder-select) {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
}
// for options in dropdown. make the font smaller and let the height be determined by the content
:deep(.custom-options) {
  .va-select-option {
    font-size: 0.75rem;
    line-height: 1rem;
    min-height: 1.75rem;
    flex: none;
  }
}
</style>
