<template>
  <va-modal v-model="visible" close-button hide-default-actions size="large">
    <div>
      <span class="font-semibold text-lg">
        Drag &amp; Drop to rearrange columns
      </span>
      <Ordering
        v-model="columns"
        id-by="key"
        label-by="label"
        class="border border-solid rounded border-gray-400 mt-2"
      />
      <div class="mt-3">
        <div class="flex flex-row gap-2">
          <div
            v-for="cat in Object.keys(colums_by_category)"
            :key="cat"
            class="flex-auto"
          >
            <span class="font-semibold tracking-wide text-lg"> {{ cat }} </span>
            <div class="flex flex-col mt-2">
              <div v-for="col in colums_by_category[cat]" :key="col.key">
                <va-checkbox
                  v-model="columnsSelected[col.key]"
                  :label="col.label"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column Legend -->
      <div class="gap-2 mt-2" style="height: 200px; overflow-y: scroll">
        <ColumnLegend :columns="Object.values(COLUMNS)" />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-start w-full">
        <va-button
          preset="primary"
          @click="
            columnsSelected = getDefaultColumns();
            hide();
          "
          class="flex-none"
        >
          Restore Defaults
        </va-button>
      </div>
    </template>
  </va-modal>
</template>

<script setup>
// shows all avaiable columns and allows the user to select which columns to display
// shows a drag and drop interface to reorder selected columns
// emits: restoreColumnDefaults: restore the default column selection

// Object of available columns (key to column object): {chr: {label: 'Chromosome', ...}, ...}
import {
COLUMNS,
getDefaultColumns,
} from "@/components/genotype/columns/columns";
import { useVariantsStore } from "@/stores/variants";
import { storeToRefs } from "pinia";

const variantsStore = useVariantsStore();
// columns: Array of objects with key and label properties [{key: 'chr', label: 'Chromosome', ...}]
// columnsSelected: Object of selected columns {chr: true, ...}
const { columns, columnsSelected } = storeToRefs(variantsStore);
// const props = defineProps({});

// modal functionality exposed to parent component
defineExpose({
  show,
  hide,
});

const visible = ref(false);

// non-reactive
// {'Allele Stats': [{...}], 'Genes': [{...}], ...}
const colums_by_category = Object.entries(COLUMNS).reduce((acc, [key, col]) => {
  if (!col.category) return acc;
  acc[col.category] = (acc[col.category] || []).concat({ key, ...col });
  return acc;
}, {});

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}
</script>
