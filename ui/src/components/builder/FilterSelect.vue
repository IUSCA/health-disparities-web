<template>
  <div class="flex items-center">
    <VaInput
      v-model="searchText"
      placeholder="Filter..."
      clearable
      class="mr-3 grow-0 basis-24"
    />
  </div>

  <VaTreeView
    :nodes="nodes"
    :filter="searchText"
    :filter-method="customFilterMethod"
    expand-node-by="node"
    style="height: 500px; overflow-y: auto"
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
import { cohortFilters, filterId } from "./cohortFilters";

const emit = defineEmits(["select"]);

const searchText = ref("");

const nodes = cohortFilters.map((category) => {
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

function customFilterMethod(node, filterText, key) {
  if (node.children) console.log(node, filterText, key);
  return (
    !node.children &&
    node.label.toLowerCase().includes(filterText.toLowerCase())
  );
}

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
