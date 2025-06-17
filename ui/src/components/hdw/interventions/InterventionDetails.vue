<template>
  <!-- api call completed and intervention is received -->
  <div
    class="h-full overflow-y-auto pr-2"
    v-if="!loading && intervention?.concepts"
  >
    <div
      v-for="item in intervention.concepts"
      :key="item.id"
      class="p-1 flex items-center justify-between"
    >
      <span>{{ item.name }} ({{ item.code }})</span>
    </div>
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
