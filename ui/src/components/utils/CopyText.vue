<template>
  <va-input
    type="text"
    readonly
    :model-value="props.text"
    class="flex-auto"
    :class="
      props.size === 'small' ? 'text-sm copy-text-input-small' : 'text-base'
    "
    preset="bordered"
  >
    <template #appendInner>
      <CopyButton :text="props.text" preset="plain" :size="props.size" />
    </template>
  </va-input>
</template>

<script setup>
const props = defineProps({
  text: String,
  size: String,
});
</script>

<style scoped lang="scss">
.copy-text-input-small :deep(.va-input-wrapper__field) {
  --va-input-wrapper-min-height: 24px;
}
</style>
