<template>
  <VaModal v-model="visible" :title="title" hide-default-actions no-dismiss>
    <NewAccessKey
      @created="handleCreated"
      @cancel="hide"
      v-if="!generatedAccessKey"
      :for-self="props.forSelf"
    />
    <div v-else>
      <AccessKey
        :access-key="generatedAccessKey"
        :show-delete="false"
        :for-self="props.forSelf"
      />
      <div class="flex justify-end">
        <VaButton preset="secondary" @click="hide">Close</VaButton>
      </div>
    </div>
  </VaModal>
</template>

<script setup>
const props = defineProps({
  forSelf: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["update"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
const generatedAccessKey = ref(null);
const title = computed(() => {
  if (generatedAccessKey.value) {
    return "Access Key Generated";
  }
  return "Generate new Access Key";
});

function hide() {
  visible.value = false;
  generatedAccessKey.value = null;
  emit("update");
}

function show() {
  generatedAccessKey.value = null;
  visible.value = true;
}

function handleCreated(accessKey) {
  generatedAccessKey.value = accessKey;
}
</script>
