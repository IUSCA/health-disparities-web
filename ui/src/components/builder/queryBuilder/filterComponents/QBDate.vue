<template>
  <div>
    <VaDateInput
      v-if="props.range"
      v-model="rangeVal"
      class="cohort-builder-date-input"
      :mode="props.range ? 'range' : null"
    />
    <VaDateInput v-else v-model="val" class="cohort-builder-date-input" />
  </div>
</template>

<script setup>
const props = defineProps({
  range: {
    type: Boolean,
    default: false,
  },
  modelValue: {
    type: [String, Array],
    default: null,
  },
});
const emit = defineEmits(["update:modelValue"]);

const rangeVal = ref({
  start: null,
  end: null,
});
const val = ref(null);

watch(
  rangeVal,
  () => {
    if (props.range) {
      if (rangeVal.value.start == null || rangeVal.value.end == null) return;

      // console.log("emit rangeVal", rangeVal.value);
      emit("update:modelValue", [rangeVal.value.start, rangeVal.value.end]);
    }
  },
  { deep: true },
);

watch(val, () => {
  if (!props.range) {
    // console.log("emit val", val.value);
    emit("update:modelValue", val.value);
  }
});

watch(
  [() => props.range, () => props.modelValue],
  () => {
    // console.log("range", props.range, "modelValue", props.modelValue);
    if (props.range) {
      if (!Array.isArray(props.modelValue)) {
        rangeVal.value.start = null;
        rangeVal.value.end = null;
        emit("update:modelValue", []);
      } else {
        rangeVal.value.start = props.modelValue[0];
        rangeVal.value.end = props.modelValue[1];
      }
    } else {
      if (Array.isArray(props.modelValue)) {
        val.value = null;
        emit("update:modelValue", null);
      } else val.value = props.modelValue;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
:deep(.cohort-builder-date-input) {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
  .va-input-wrapper__field i.va-icon {
    font-size: small !important;
  }
}
</style>
