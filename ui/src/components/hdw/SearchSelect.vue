<template>
  <VaSelect
    v-model="selected"
    :options="items"
    :label="props.label"
    :loading="loading"
    text-by="name"
    track-by="id"
    searchable
    class="select-item"
  >
    <template #prependInner v-if="props.icon">
      <Icon :icon="props.icon" />
    </template>
  </VaSelect>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  searchFunction: {
    type: Function,
    required: true,
  },
  icon: {
    type: String,
    default: null,
  },
});

const selected = defineModel();
const items = ref([]);
const loading = ref(false);

onMounted(() => {
  loading.value = true;
  props
    .searchFunction()
    .then((res) => {
      items.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>

<style>
.select-item label.va-input-label {
  font-size: 0.8rem;
}
</style>
