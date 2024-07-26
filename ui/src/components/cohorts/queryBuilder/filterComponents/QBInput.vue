<template>
  <div v-if="props.range" class="flex gap-3">
    <VaInput
      class="cohort-builder-input w-36"
      v-model="min"
      placeholder="min"
    />
    <VaInput
      class="cohort-builder-input w-36"
      v-model="max"
      placeholder="max"
    />
  </div>
  <VaInput class="cohort-builder-input" v-model="val" v-else />
</template>

<script setup>
const props = defineProps(["identifier", "range", "modelValue"]);
const emit = defineEmits(["update:modelValue"]);

const min = ref(null);
const max = ref(null);
const val = ref(null);

watch([min, max], () => {
  if (min.value == null || max.value == null) return;
  if (props.range) emit("update:modelValue", [min.value, max.value]);
});

watch(val, () => {
  if (props.range) return;
  emit("update:modelValue", val.value);
});

watch(
  [() => props.range, () => props.modelValue],
  () => {
    if (props.range) {
      if (!Array.isArray(props.modelValue)) {
        min.value = null;
        max.value = null;
        emit("update:modelValue", []);
      } else {
        min.value = props.modelValue[0];
        max.value = props.modelValue[1];
      }
    } else {
      if (Array.isArray(props.modelValue))
        val.value = null; // emits update event with null
      else val.value = props.modelValue;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
:deep(.va-input-wrapper__field) {
  --va-input-wrapper-min-height: 20px;
}
</style>
