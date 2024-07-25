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
    <div>
      <CohortSearchFilters
        v-model:params="params"
        @reset="reset"
        class="mb-3"
      />
      <CohortTable :params="params" @select="handleSelect" />
    </div>
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

const defaultParams = () => ({
  search_term: "",
  is_published: "",
  is_locked: "",
  is_mine: true,
  type: "",
});
const params = ref(defaultParams());
function reset() {
  params.value = defaultParams();
}

function handleSelect(cohort) {
  emit("select", cohort);
  hide();
}
</script>
