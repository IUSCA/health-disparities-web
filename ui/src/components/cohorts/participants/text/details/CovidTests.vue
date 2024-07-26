<template>
  <VaDataTable
    :items="props.data"
    :columns="columns"
    v-model:sort-by="defaultSortField"
    v-model:sorting-order="defaultSortOrder"
    virtual-scroller
    sticky-header
    class="datatable text-sm"
    style="height: 300px"
  >
    <template #cell(date)="{ source }">
      {{ datetime.absolute(source) }}
    </template>
  </VaDataTable>
</template>

<script setup>
import * as datetime from "@/services/datetime";
const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
});

const columns = [
  {
    key: "name",
    tdStyle: "truncate;",
    sortable: true,
    width: "300px",
  },
  { key: "date", width: "200px", sortable: true },
  { key: "result", width: "100px", sortable: true },
];
const defaultSortField = ref("date");
const defaultSortOrder = ref("asc");
</script>

<style scoped>
.datatable {
  --va-data-table-cell-padding: 1px;
}
</style>
