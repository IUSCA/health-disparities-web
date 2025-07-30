<template>
  <!-- api call completed and intervention is received -->
  <div
    class="h-full overflow-y-auto pr-2"
    v-if="!loading && intervention?.concepts"
  >
    <VaDataTable
      :items="intervention.concepts"
      :columns="[
        { key: 'code', label: 'Code' },
        {
          key: 'code_system',
          label: 'System',
          width: '120px',
          tdClass: 'truncate',
        },
        { key: 'name', label: 'Name', tdClass: 'truncate', width: '580px' },
      ]"
      class="w-full text-sm intervention-details-table"
    >
      <template #bodyCell="{ item, column }">
        <span>{{ item[column.key] }}</span>
      </template>
    </VaDataTable>
    <div v-if="intervention.concepts.length === 0">
      <div class="p-1 flex items-center justify-between">No concepts</div>
    </div>
  </div>
  <!-- loading -->
  <div
    v-else-if="!loading"
    class="flex flex-col items-center justify-center h-full"
  >
    <div class="flex items-center justify-center gap-2 va-text-secondary">
      <i-mdi-information-outline class="text-2xl" />
      <span>Unable to load concepts</span>
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-full">
    <div class="flex items-center justify-center gap-2 va-text-secondary">
      <i-mdi-loading class="animate-spin text-2xl" />
      <span>Loading concepts</span>
    </div>
  </div>
</template>

<script setup>
import interventionService from "@/services/hdw/interventions";
const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
});

const intervention = ref(null);
const loading = ref(true);

watch(
  () => props.id,
  () => {
    loading.value = true;
    interventionService
      .get(props.id)
      .then((res) => {
        intervention.value = res.data;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        loading.value = false;
      });
  },
  {
    immediate: true,
  },
);
</script>

<style scoped>
.intervention-details-table {
  --va-data-table-cell-padding: 4px;
}
</style>
