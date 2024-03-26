<template>
  <!-- table -->
  <!-- style="height: calc(100vh - 13.75rem); overflow-y: scroll" -->
  <va-data-table
    :items="props.results"
    :columns="columns"
    :loading="loading"
    hoverable
    sticky-header
    class="annotationtable text-sm"
  >
    <template #cell(chr)="{ rowData }">
      {{ `${rowData.chr}-${rowData.position}-${rowData.ref}-${rowData.alt}` }}
    </template>

    <!-- 1/1 (c2) when unphased, 1|1 (c3) when phased -->
    <template #cell(homalt)="{ rowData }">
      {{ rowData.phase ? rowData.c3 : rowData.c2 }}
    </template>

    <!-- 1|0 c2 when phased -->
    <template #cell(hetflipped)="{ rowData }">
      {{ rowData.phase ? rowData.c2 : null }}
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
import { PAGE_SIZE_OPTIONS } from "@/components/genotype/constants";
import { useVariantsStore } from "@/stores/variants";
import { storeToRefs } from "pinia";

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

const varaintsStore = useVariantsStore();
const { currPage, pageSize, columns } = storeToRefs(varaintsStore);
</script>

<style scoped>
.annotationtable {
  --va-data-table-cell-padding: 1px;

  /* in Vuestic v1.8.7 va-virtual-scroller css class is applied to table even
  *  when virtual scrolling is disabled. This causes the table to occupy 100% of 
  * the height of the parent container. This is a workaround to override that
  * behavior.
  */
  height: auto;
}
</style>
