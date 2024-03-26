<template>
  <!--     style="height: 200px; overflow-y: scroll" -->
  <va-data-table
    :items="props.columns"
    :columns="legend_columns"
    striped
    sticky-header
    class="legendtable"
  />
</template>

<script setup>
const props = defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
});
const legend_columns = [
  {
    key: "category",
    label: "Category",
    sortable: true,
    width: "100px",
  },
  { key: "label", label: "Name", sortable: true, width: "150px" },
  {
    key: "thTitle",
    label: "Description",
    sortable: true,
    tdStyle: "white-space: pre-wrap; word-wrap: break-word;",
  },
];
</script>

<style scoped>
.legendtable {
  --va-data-table-cell-padding: 3px;
}
</style>
