<template>
  <!-- table -->
  <!-- style="height: calc(100vh - 13.75rem); overflow-y: scroll" -->
  <va-data-table
    :items="rows"
    :columns="columns"
    :loading="loading"
    hoverable
    sticky-header
    class="annotation-table text-sm"
  >
    <template #cell(chr)="{ rowData }">
      {{ `${rowData.chr}-${rowData.position}-${rowData.ref}-${rowData.alt}` }}
    </template>
  </va-data-table>

  <!-- pagination -->
  <Pagination
    class="px-1 lg:px-3 mt-2"
    v-model:page="currPage"
    v-model:page_size="pageSize"
    :total_results="props.total_count"
    :curr_items="props.results.length"
    :page_size_options="PAGE_SIZE_OPTIONS"
  />
</template>

<script setup>
import {
  NUMERIC_PRECISION,
  PAGE_SIZE_OPTIONS,
} from "@/components/genotype/constants";
import { useVariantsStore } from "@/stores/variants";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { COLUMNS } from "./columns/columns";

const props = defineProps({
  results: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  total_count: Number,
});

const variantsStore = useVariantsStore();
const { currPage, pageSize, columns } = storeToRefs(variantsStore);

function formatNumericData(data) {
  // data is column_key: value object, value is sometimes a number
  // columns is column_key: column object
  // for each column, if it is a numeric column, format the number
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (COLUMNS[key]?.numeric) {
      acc[key] = value != null ? _.round(value, NUMERIC_PRECISION) : null;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
}

const rows = computed(() => {
  return props.results.map((row) => formatNumericData(row));
});
</script>

<style scoped>
.annotation-table {
  --va-data-table-cell-padding: 1px;

  /* in Vuestic v1.8.7 va-virtual-scroller css class is applied to table even
  *  when virtual scrolling is disabled. This causes the table to occupy 100% of 
  * the height of the parent container. This is a workaround to override that
  * behavior.
  */
  height: auto;
}
</style>
