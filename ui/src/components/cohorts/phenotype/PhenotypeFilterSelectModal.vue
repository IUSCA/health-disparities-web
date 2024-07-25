<template>
  <va-modal
    v-model="visible"
    title="Add Filter"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
  >
    <PhenotypeFilterSelect :filters="props.filters" @select="handleSelect" />
  </va-modal>
</template>

<script setup>
const props = defineProps({
  filters: Object,
});

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
let resolve = null;

function hide() {
  visible.value = false;
  if (resolve) {
    resolve(null);
    resolve = null;
  }
}

function show(cb) {
  /*
    This method is called from the parent component to show the modal.
    It takes a callback function as an argument, which will be called when the user selects a filter.
    The callback function will receive the selected filter node as an argument.

    If the modal is closed without selecting a filter, the callback function will be called with null as an argument.
  */
  visible.value = true;
  resolve = cb;
}

function handleSelect(node) {
  if (resolve) {
    resolve(node);
    resolve = null;
  }
  hide();
}
</script>
