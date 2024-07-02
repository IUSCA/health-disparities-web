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
import variantService from "@/services/variants";
import { useVariantsStore } from "@/stores/variants";
import _ from "lodash";
import { storeToRefs } from "pinia";

const variantsStore = useVariantsStore();
const { source, snapshot_id, searchParams } = storeToRefs(variantsStore);

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
    const [_cat, field] = props.identifier.split(props.separator);
    loading.value = true;
    variantService
      .getAnnotationsUniqueValues(field, {
        source_id: source.value?.id || 1, // TODO
        snapshot_id: snapshot_id.value || 1,
        ranges: searchParams.value.map((p) => _.omit(p, ["text"])),
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
