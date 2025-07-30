<template>
  <div class="w-full">
    <!-- search bar for local search; clearable -->
    <!-- <div class="w-full text-sm">
      <va-input
        v-model="search_text"
        class="w-full"
        :placeholder="searchPlaceholder"
        outline
        clearable
      >
        <template #prependInner>
          <Icon icon="material-symbols:search" class="text-xl" />
        </template>
      </va-input>
    </div> -->

    <!-- chips with close button for each of the entities selected -->
    <div
      class="max-h-[200px] overflow-y-scroll mt-3 flex flex-wrap gap-2 text-sm"
    >
      <VaChip
        v-for="(item, index) in selectedList"
        :key="index"
        square
        size="small"
        color="secondary"
        :label="`${item.name} (${item.code})`"
        closeable
        @update:modelValue="removeItem(index)"
      >
        <!-- chip's display name: name (code); name is truncated to some max width -->
        <VaPopover :hover-over-timeout="500">
          <div class="max-w-[200px] truncate">
            <span class="font-semibold pr-1">{{ item.code }}</span>
            <span class="">{{ item.name }}</span>
          </div>

          <template #title>
            <span>{{ item.code }}</span>
            <span class="va-text-secondary text-xs pl-2">
              {{ item.code_system }}
            </span>
          </template>

          <template #body>
            <p class="break-words max-w-64">{{ item.name }}</p>
          </template>
        </VaPopover>
      </VaChip>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedList: {
    type: Array,
    default: () => [],
  },
  entityType: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["remove-item"]);

// const search_text = ref("");
// const searchPlaceholder = `Search for ${props.entityType.toLowerCase()}...`;

function removeItem(index) {
  // Emit an event to the parent component to handle the removal
  emit("remove-item", props.selectedList[index]);
}
</script>

<style scoped lang="scss">
:deep(.va-input-wrapper__field) {
  --va-input-wrapper-min-height: 30px;
}
</style>
