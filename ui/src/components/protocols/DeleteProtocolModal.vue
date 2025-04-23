<template>
  <va-modal
    class="delete-protocol-modal"
    v-model="visible"
    title="Delete Protocol?"
    no-outside-dismiss
    fixed-layout
    ok-text="Delete"
    @ok="handleOk"
    @cancel="hide"
  >
    <va-inner-loading :loading="loading">
      <div class="space-y-2">
        <div class="text-lg font-medium">
          Are you sure you want to delete
          <span class="font-semibold text-red-600 dark:text-red-400 ml-1">{{
            props.protocol.name
          }}</span
          >?
        </div>

        <p class="va-text-secondary mt-2">This action cannot be undone.</p>

        <p
          v-if="
            props.protocol?.users?.length && props.protocol?.num_participants
          "
          class="va-text-secondary"
        >
          <span class="font-semibold">
            {{ maybePluralize(props.protocol.users.length, "user") }}
          </span>
          may lose access to the data of
          <span class="font-semibold">
            {{
              maybePluralize(props.protocol.num_participants, "participant")
            }} </span
          >.
        </p>
      </div>
    </va-inner-loading>
  </va-modal>
</template>

<script setup>
import protocolService from "@/services/protocols";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";

const props = defineProps(["protocol"]);
const emit = defineEmits(["delete"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
const loading = ref(false);

function hide() {
  loading.value = false;
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handleOk() {
  loading.value = true;
  const id = props.protocol.id;

  protocolService
    .delete(id)
    .then(() => {
      toast.success("Protocol deleted successfully");
      emit("delete");
    })
    .finally(() => {
      loading.value = false;
      hide();
    });
}
</script>
