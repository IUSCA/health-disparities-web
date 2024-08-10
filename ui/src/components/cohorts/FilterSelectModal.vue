<template>
  <va-modal
    v-model="visible"
    title="Add Filter"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    size="large"
  >
    <FilterSelect
      :filters="props.filters"
      :recent-filters="sortedRecents"
      @select="handleSelect"
      @clear-recent-filters="recentFilters = {}"
    />
  </va-modal>
</template>

<script setup>
const recentFilters = defineModel("recents", {
  type: Object,
});
const props = defineProps({
  filters: Object,
});
const emit = defineEmits(["select"]);

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
  emit("select", node);
  handleFilterSelect(node);
}

const MAX_RECENT_FILTERS = 5;
const sortedRecents = computed(() => {
  return Object.entries(recentFilters.value)
    .sort((a, b) => {
      // sort by timestamp descending
      return b[1] - a[1];
    })
    .map(([id, _]) => id)
    .slice(0, MAX_RECENT_FILTERS); // show only 5 recent filters
});

function handleFilterSelect(node) {
  recentFilters.value[node.id] = Date.now();
  // remove the oldest filter if more than 5 filters are present
  if (Object.keys(recentFilters.value).length > MAX_RECENT_FILTERS) {
    const oldestKey = Object.entries(recentFilters.value)
      .sort((a, b) => a[1] - b[1])
      .map(([id, _]) => id)[0];
    delete recentFilters.value[oldestKey];
  }
}
</script>
