import {
  COLUMNS,
  getDefaultColumns,
} from "@/components/genotype/columns/columns";
import _ from "lodash";
import { acceptHMRUpdate, defineStore } from "pinia";
import { ref } from "vue";

export const useVariantsStore = defineStore("varaints", () => {
  const currPage = ref(1);
  const pageSize = ref(50);

  console.log("getDefaultColumns", getDefaultColumns());
  // columns: Array of objects with key and label properties [{key: 'chr', label: 'Chromosome', ...}]
  // columnsSelected: Object of selected columns {chr: true, ...}
  const columns = ref(useLocalStorage("variants.columns", []));
  const columnsSelected = ref(
    useLocalStorage("variants.columnsSelected", getDefaultColumns()),
  );

  const source = ref(null);
  const snapshot_id = ref(null);
  const range = ref(null);
  const searchParams = ref([]);

  function addSearchParam(param) {
    // add if not already present
    const existing = searchParams.value.find((p) => _.isEqual(p, param));
    if (!existing) searchParams.value.push(param);
  }

  function removeSearchParam(param) {
    console.log("removeSearchParam", param);
    const index = searchParams.value.findIndex((p) => _.isEqual(p, param));
    if (index > -1) searchParams.value.splice(index, 1);
  }

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
    source,
    snapshot_id,
    range,
    searchParams,
    addSearchParam,
    removeSearchParam,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useVariantsStore, import.meta.hot));
