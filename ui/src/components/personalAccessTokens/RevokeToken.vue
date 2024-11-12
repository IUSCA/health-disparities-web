<template>
  <VaModal title="Are you sure you want to delete this token?" close-button>
    <div>
      Any scripts or applications using this token will no longer be able to
      access the API. You cannot undo this action.
    </div>

    <div>
      <VaButton preset="secondary">Cancel</VaButton>
      <VaButton preset="danger" @click="revoke">Delete</VaButton>
    </div>
  </VaModal>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
import toast from "@/services/toast";

const props = defineProps({
  token: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["deleted"]);

const loading = ref(false);

function revoke() {
  loading.value = true;
  apiKeyService
    .delete(props.token.id)
    .then(() => {
      toast.success("Token deleted");
      emit("deleted");
    })
    .catch(() => {
      toast.error("Failed to delete token");
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
