<template>
  <va-select
    class="w-[220px]"
    v-model="model"
    :options="snapshot_options"
    text-by="name"
    value-by="id"
    placeholder="Select a snapshot"
    label="Snapshot"
    searchable
    inner-label
    :highlight-matched-text="false"
  >
    <template #appendInner>
      <VaPopover message="todo">
        <Icon icon="mdi:help-circle" class="text-base va-text-secondary" />
      </VaPopover>
    </template>
  </va-select>
</template>

<script setup>
import * as datetime from "@/services/datetime";
import snapshotsService from "@/services/snapshots";

const model = defineModel();
// const props = defineProps({});

const snapshot_options = ref([]);

snapshotsService.getAll().then((res) => {
  snapshot_options.value = res.data.map((snp) => ({
    id: snp.id,
    name: `${snp.name} (${datetime.date(snp.timestamp)})`,
  }));
  model.value = snapshot_options.value[0].id;
});
</script>
