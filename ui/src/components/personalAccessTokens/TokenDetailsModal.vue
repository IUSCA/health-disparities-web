<template>
  <VaModal v-model="visible" close-button hide-default-actions>
    <div class="mt-3">
      <Token :token="apiKey" :show-delete="false" />
    </div>
  </VaModal>
</template>

<script setup>
// const props = defineProps({});

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
const apiKey = ref(null);

function hide() {
  visible.value = false;
  apiKey.value = null;
}

function show(data) {
  visible.value = true;
  apiKey.value = data;
}
</script>
