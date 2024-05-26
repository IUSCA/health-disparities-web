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
import sourceSerice from "@/services/sources";
const model = defineModel();
// const props = defineProps({});

const source_options = ref([]);

sourceSerice.getAll().then((res) => {
  source_options.value = res.data;
  model.value = source_options.value[0];
});
</script>
