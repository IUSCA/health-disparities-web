import {
  COLUMNS,
  getDefaultColumns,
} from "@/components/genotype/columns/columns";
import { acceptHMRUpdate, defineStore } from "pinia";
import { ref } from "vue";

export const useVariantsStore = defineStore("varaints", () => {
  const currPage = ref(1);
  const pageSize = ref(50);

  // columns: Array of objects with key and label properties [{key: 'chr', label: 'Chromosome', ...}]
  // columnsSelected: Object of selected columns {chr: true, ...}
  const columns = ref(useLocalStorage("variants.columns", []));
  const columnsSelected = ref(
    useLocalStorage("variants.columnsSelected", getDefaultColumns()),
  );

  // watch columnsSelected and update columns
  watch(
    columnsSelected,
    () => {
      // add or remove columns from columns preserving the existing order

      // remove from current column objects that are no longer selected
      const filtered_columns = columns.value.filter(
        (col) => columnsSelected.value[col.key],
      );
      const current_col_keys = new Set(filtered_columns.map((col) => col.key));

      // columns that are not in columns but are selected
      const new_columns = Object.entries(columnsSelected.value)
        .filter(([key, shown]) => shown && !current_col_keys.has(key))
        .map(([key, _]) => ({ key, ...COLUMNS[key] }));
      columns.value = filtered_columns.concat(new_columns);
    },
    { deep: true, immediate: true },
  );

  return {
    currPage,
    pageSize,
    columns,
    columnsSelected,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useVariantsStore, import.meta.hot));
