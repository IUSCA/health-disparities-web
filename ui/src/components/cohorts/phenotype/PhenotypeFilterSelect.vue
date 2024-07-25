<template>
  <div class="flex items-center gap-3 md:gap-5">
    <VaInput
      v-model="searchText"
      placeholder="Search for filters and categories"
      clearable
      class="w-72"
    />
    <VaCheckbox v-model="expandAll" label="Expand All" class="" />
  </div>

  <VaTreeView
    :nodes="filteredNodes"
    expand-node-by="node"
    style="height: 500px; overflow-y: auto"
    :expand-all="expandAll"
    :key="expandAll"
  >
    <template #content="node">
      <span v-if="node.children?.length"> {{ node.label }} </span>
      <button
        v-else
        @click="emit('select', node)"
        class="w-full text-left flex items-center gap-2"
      >
        <span> {{ node.label }} </span>
        <div class="rounded dark:bg-gray-800 bg-gray-100 px-1 text-lg">
          <Icon :icon="getTypeIcon(node.type)" />
        </div>
      </button>
    </template>

    <template #icon="node">
      <Icon :icon="node.icon" />
    </template>
  </VaTreeView>
</template>

<script setup>
import { filterId } from "@/components/cohorts/phenotype/filters";

const props = defineProps({
  filters: Object,
});

const emit = defineEmits(["select"]);

const searchText = ref("");
const expandAll = ref(false);

// Expand all when search text is first entered
watch(searchText, (newVal, oldVal) => {
  if (newVal && !oldVal) expandAll.value = true;
});

const nodes = props.filters.map((category) => {
  return {
    id: category.key,
    label: category.label,
    icon: category.icon || "mdi-folder",
    children: category.filters.map((filter) => {
      return {
        id: filterId(category.key, filter.key),
        label: filter.label,
        type: filter.type,
      };
    }),
  };
});

// TreeView's inbuilt filter method doesn't work as expected
const filteredNodes = computed(() => {
  if (!searchText.value) return nodes;
  // if searchText matches a parent node, return it with all children
  // else return parent node with only matched children
  // if no children match, omit the parent node
  // WARNING: This only works for 2 levels of nesting
  return nodes
    .map((category) => {
      if (
        category.label.toLowerCase().includes(searchText.value.toLowerCase())
      ) {
        return category;
      }
      const matchedChildren = category.children.filter((child) =>
        child.label.toLowerCase().includes(searchText.value.toLowerCase()),
      );
      if (matchedChildren.length === 0) return null;
      return Object.assign({}, category, { children: matchedChildren });
    })
    .filter(Boolean);
});

// function customFilterMethod(node, filterText, key) {
//   if (node.children) console.log(node, filterText, key);
//   return (
//     !node.children &&
//     node.label.toLowerCase().includes(filterText.toLowerCase())
//   );
// }

function getTypeIcon(type) {
  switch (type) {
    case "text":
      return "mdi-abc";
    case "asyncSelect":
      return "mdi-format-list-group";
    case "number":
      return "mdi-numeric";
    case "date":
      return "mdi-calendar";
    case "select":
      return "mdi-format-list-group";
    default:
      return "mdi-folder";
  }
}
</script>
