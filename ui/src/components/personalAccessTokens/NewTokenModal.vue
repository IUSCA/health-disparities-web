<template>
  <VaModal v-model="visible" :title="title" hide-default-actions no-dismiss>
    <NewToken
      @created="handleCreated"
      @cancel="hide"
      v-if="!generatedToken"
      :for-self="props.forSelf"
    />
    <div v-else>
      <Token
        :token="generatedToken"
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
const generatedToken = ref(null);
const title = computed(() => {
  if (generatedToken.value) {
    return "API Token Generated";
  }
  return "Generate new API token";
});

function hide() {
  visible.value = false;
  generatedToken.value = null;
  emit("update");
}

function show() {
  generatedToken.value = null;
  visible.value = true;
}

function handleCreated(token) {
  generatedToken.value = token;
}
</script>
