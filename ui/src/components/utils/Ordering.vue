<template>
  <div>
    <div class="flex flex-row flex-nowrap items-center p-3 min-h-14">
      <ul ref="ordering" class="flex flex-row flex-wrap gap-2">
        <li
          v-for="k in itemKeys"
          :key="k"
          :class="`name-${k} px-2 py-1 border bg-gray-200 dark:bg-gray-600 rounded text-center shadow cursor-pointer flex-none min-w-[50px] max-w-[200px] truncate`"
          :data-id="k"
        >
          {{ id_item_map[k][props.labelBy] }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
/**
 * This component allows the user to reorder items in a list.
 * Items is an array of objects, each object must have a unique key.
 * The names displayed in the list can be customized by passing a `labelBy` key.
 */
import Sortable from "sortablejs";
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
  idBy: {
    type: String,
    required: true,
  },
  labelBy: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["update:modelValue"]);

const items = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const id_item_map = computed({
  get: () => {
    const map = {};
    for (const item of items.value) {
      map[item[props.idBy]] = item;
    }
    return map;
  },
});

const itemKeys = computed({
  get: () => items.value.map((item) => item[props.idBy]),
  set: (val) => {
    items.value = val.map((id) => id_item_map.value[id]);
  },
});

const ordering = ref(null);
defineExpose({
  ordering,
});

let orderingObj = null;

onMounted(() => {
  orderingObj = Sortable.create(ordering.value, {
    group: {
      name: "ordering",
      pull: true,
      put: ["ordering"],
    },
    swapThreshold: 1,
    animation: 150,
    onEnd: () => {
      itemKeys.value = orderingObj.toArray();
    },
  });
});
</script>
