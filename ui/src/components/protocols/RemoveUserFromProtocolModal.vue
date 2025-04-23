<template>
  <VaModal
    v-model="visible"
    title="Remove User From Protocol"
    fixed-layout
    hide-default-actions
    @close="hide"
    no-esc-dismiss
  >
    <div>
      <div class="space-y-2">
        <div class="text-lg font-medium">
          Are you sure you want to remove
          <span class="font-semibold text-red-600 dark:text-red-400 ml-1">{{
            user.name
          }}</span>
          from this protocol?
        </div>

        <p class="va-text-secondary mt-2">This action cannot be undone.</p>

        <p v-if="props.protocol?.num_participants" class="va-text-secondary">
          <span class="font-semibold">
            {{ user.name }}
          </span>
          may lose access to the data of
          <span class="font-semibold">
            {{
              maybePluralize(props.protocol.num_participants, "participant")
            }} </span
          >.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-5">
        <va-button
          preset="secondary"
          class="flex-none"
          @click="hide"
          color="secondary"
          :disabled="loading"
        >
          Cancel
        </va-button>

        <va-button
          class="flex-none"
          @click="removeUser"
          color="success"
          icon="person_remove"
          :loading="loading"
        >
          Remove User
        </va-button>
      </div>
    </template>
  </VaModal>
</template>

<script setup>
import protocolService from "@/services/protocols";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";

const props = defineProps({
  protocol: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
const user = ref();
const loading = ref(false);

function show(_user) {
  visible.value = true;
  user.value = _user;
}
function hide() {
  visible.value = false;
}

function removeUser() {
  loading.value = true;
  protocolService
    .removeUser(props.protocol.id, user.value.id)
    .then(() => {
      toast.success("User removed successfully");
      emit("update");
      hide();
    })
    .catch((err) => {
      console.error("server error", err);
      toast.error("Unable to remove user");
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
