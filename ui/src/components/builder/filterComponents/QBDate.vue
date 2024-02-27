<template>
  <div>
    <VaDateInput v-model="model" />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: Date,
});
const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
  },
});
</script>

<style scoped lang="scss">
:deep {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
  .va-input-wrapper__field i.va-icon {
    font-size: small !important;
  }
}
</style>
