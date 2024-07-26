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
import { injectionKeys } from "@/components/genotype/constants";
import genotypeService from "@/services/genotypes";

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
const snapshot_id = inject(injectionKeys.snapshotId);
const source_id = inject(injectionKeys.sourceId);
const ranges = inject(injectionKeys.ranges);

watch(
  [() => props.identifier, snapshot_id, source_id, ranges],
  () => {
    const [_cat, field] = props.identifier.split(props.separator);
    loading.value = true;
    genotypeService
      .getAnnotationsUniqueValues(field, {
        source_id: source_id.value,
        snapshot_id: snapshot_id.value,
        ranges: ranges.value,
      })
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
