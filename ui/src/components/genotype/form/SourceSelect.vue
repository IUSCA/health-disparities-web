<template>
  <va-select
    class="flex-none w-[200px]"
    v-model="model"
    :options="source_options"
    placeholder="Select a source"
    label="Data Source"
    searchable
    inner-label
    text-by="name"
    value-by="id"
    :highlight-matched-text="false"
  >
    <template #appendInner>
      <VaPopover message="todo">
        <Icon icon="mdi:help-circle" class="text-base va-text-secondary" />
      </VaPopover>
    </template>
  </va-select>
</template>

<script setup>
import sourceService from "@/services/sources";
const model = defineModel();
// const props = defineProps({});

const source_options = ref([]);

sourceService.getAll().then((res) => {
  // change made for a demo:
  // hide source - imputed data
  // select by default AXIN source
  source_options.value = res.data.filter((s) => s.id !== 2);
  model.value = source_options.value[1].id;
});
</script>
