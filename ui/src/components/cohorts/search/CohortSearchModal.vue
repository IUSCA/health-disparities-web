<template>
  <va-modal
    v-model="visible"
    title="Search for a Cohort"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    size="large"
  >
    <CohortSearch
      @select="handleSelect"
      :default-is-published="props.defaultIsPublished"
    />
  </va-modal>
</template>

<script setup>
const props = defineProps({
  defaultIsPublished: {
    type: Boolean,
    default: null,
  },
});

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const emit = defineEmits(["select"]);

const visible = ref(false);

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handleSelect(cohort) {
  emit("select", cohort);
  hide();
}
</script>
