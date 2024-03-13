<template>
  <va-modal
    v-model="visible"
    title="Search for a Cohort"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    class="z-10"
    size="large"
  >
    <CohortSearch @select="handleSelect" />
  </va-modal>
</template>

<script setup>
// const props = defineProps({});

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
