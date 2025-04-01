<!-- 
  Make any changes made to this component to AnnotationSelect.vue as well
-->
<template>
  <div class="flex-grow">
    <VaSelect
      :key="selectKey"
      v-model="model"
      :options="options"
      :text-by="textBy"
      :value-by="valueBy"
      :track-by="trackBy"
      class="text-sm cohort-builder-select w-full"
      multiple
      :loading="loading"
      :max-visible-options="3"
      selected-top-shown
      searchable
      :highlight-matched-text="false"
      :teleport="teleportOptions"
    >
      <template #option-content="{ option }">
        <span>
          <!-- fallback to "string" model when the possible options haven't been fetched -->
          {{ option[textBy] || option }}
          <span v-if="option?.count != null" class="select-option-count">
            ({{ option.count }})
          </span>
        </span>
      </template>
    </VaSelect>
    <div ref="teleportOptions" class="custom-options"></div>
  </div>
</template>

<script setup>
import phenotypesService from "@/services/phenotypes";

const props = defineProps({
  identifier: String,
  separator: {
    type: String,
    default: ".",
  },
  textBy: {
    type: String,
    default: "name",
  },
  valueBy: {
    type: String,
    default: "name",
  },
  trackBy: {
    type: String,
    default: "name",
  },
  fetchOptionsFn: {
    type: Function,
    default: (category, field) => {
      return phenotypesService.unique(category, field).then((res) => {
        return Object.entries(res.data).map(([name, count]) => ({
          name,
          count,
        }));
      });
    },
  },
});
const model = defineModel();

const options = ref([]);
const loading = ref(false);
const teleportOptions = ref(null);
const selectKey = ref(0);

watch(
  () => props.identifier,
  () => {
    const [category, field] = props.identifier.split(props.separator);
    loading.value = true;
    props
      .fetchOptionsFn(category, field)
      .then((res) => {
        options.value = res;
      })
      .finally(() => {
        loading.value = false;
      });
  },
  { immediate: true },
);

// when the model is set before the options are fetched,
// the select will show the model as the selected option's value
// this is problematic when valueBy is not the same as textBy.
// Re-render the select to show the selected option's text.
watch(options, () => {
  if (model.value != null || model.value?.length > 0) {
    // model is set before options are fetched
    // re-render the select to show the selected options
    selectKey.value = new Date().getTime();
  }
});
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

// hide the count in the select input because using option-content slot shows the count in both the dropdown and the input
:deep(.va-input-wrapper__text .select-option-count) {
  display: none;
}
</style>
