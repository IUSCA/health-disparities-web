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
    <template #cell(start_date)="{ source }">
      {{ datetime.absolute(source) }}
    </template>

    <template #cell(strength)="{ rowData }">
      {{ rowData.strength_dose }} {{ rowData.strength_dose_unit }}
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
    tdStyle: "truncate; text-transform: lowercase;",
    sortable: true,
    width: "300px",
  },
  {
    key: "category",
    tdStyle: "truncate; text-transform: uppercase;",
    sortable: true,
    width: "100px",
  },
  { key: "start_date", width: "200px", sortable: true },
  { key: "strength", width: "100px", sortable: false },
  { key: "nbr_refills", label: "# REFILLS", width: "100px", sortable: true },
];
const defaultSortField = ref("start_date");
const defaultSortOrder = ref("asc");
</script>

<style scoped>
.datatable {
  --va-data-table-cell-padding: 1px;
}
</style>
