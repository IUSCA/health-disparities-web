<template>
  <VaDataTable
    :items="props.data"
    :columns="columns"
    v-model:sort-by="defaultSortField"
    v-model:sorting-order="defaultSortOrder"
    virtual-scroller
    sticky-header
    class="data-table text-sm"
    style="height: 300px"
  >
    <template #cell(admit_date)="{ source }">
      {{ datetime.absolute(source) }}
    </template>
    <template #cell(discharge_date)="{ source }">
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
  { key: "admit_date", width: "200px", sortable: true },
  { key: "discharge_date", width: "200px", sortable: true },
  { key: "dx_code", width: "100px", sortable: true },
  { key: "dx_code_system", width: "100px", sortable: true },
  { key: "enc_id", width: "100px", sortable: true },
];
const defaultSortField = ref("admit_date");
const defaultSortOrder = ref("asc");
</script>

<style scoped>
.data-table {
  --va-data-table-cell-padding: 1px;
}
</style>
