<template>
  <va-modal
    v-model="visible"
    close-button
    hide-default-actions
    size="large"
    title="Columns Legend"
  >
    <div>
      <ColumnLegend :columns="Object.values(COLUMNS)" />
    </div>
  </va-modal>
</template>

<script setup>
import { COLUMNS } from "@/components/genotype/columns/columns";
// const props = defineProps({})

// modal functionality exposed to parent component
defineExpose({
  show,
  hide,
});

const visible = ref(false);

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}
</script>
