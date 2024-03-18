<template>
  <VaCollapse
    v-model="collapse_value"
    class=""
    :header="`History (${props.history.length})`"
    icon="history"
  >
    <div
      class="text-sm max-h-[140px] overflow-y-scroll overflow-x-clip flex flex-col gap-2"
    >
      <div
        v-for="(item, idx) in props.history"
        :key="item.timestamp"
        class="flex gap-2 items-center"
      >
        <!-- time -->
        <div class="">
          <div>
            {{ datetime.time(item.timestamp) }}
          </div>
          <!-- <div class="va-text-secondary">
            {{ datetime.fromNow(item.timestamp) }}
          </div> -->
        </div>

        <!-- size and change -->
        <div class="flex-auto flex gap-1 justify-start pl-3">
          <!-- <i-mdi-account-group class="" /> -->
          <span>{{ item.snapshot.size }}</span>
          <CohortSizeChange :change="sizeChange(idx)" parenthesis />
        </div>

        <!-- restore button -->
        <div class="">
          <VaButton
            size="small"
            icon="replay"
            preset="primary"
            round
            @click="emit('restore', item)"
          >
            Restore
          </VaButton>
        </div>
      </div>
    </div>
  </VaCollapse>
</template>

<script setup>
import * as datetime from "@/services/datetime";
const props = defineProps({
  history: Array,
});
const emit = defineEmits(["restore"]);

console.log("QueryHistory", props.history, props.history.length);

const collapse_value = ref(false);

function sizeChange(idx) {
  if (idx === props.history.length - 1) {
    return null;
  }
  return (
    props.history[idx].snapshot.size - props.history[idx + 1].snapshot.size
  );
}
</script>

<style scoped lang="scss">
:deep(.va-collapse__header) {
  padding: 0 0 0.25rem 0;
}
:deep(.va-collapse__content) {
  padding-left: 0.25rem;
  padding-right: 0;
}
:deep(.va-collapse__header__text) {
  font-weight: normal;
  font-size: small;
}
</style>
