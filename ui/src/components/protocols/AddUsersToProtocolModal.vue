<template>
  <VaModal
    v-model="visible"
    title="Add Users to Protocol"
    fixed-layout
    hide-default-actions
    @close="hide"
    no-esc-dismiss
  >
    <div class="mb-3">
      <UserSelect @select="handleUserSelect" :default-visible="false" />
      <div class="overflow-y-auto h-[300px] mt-5" v-if="isValid">
        <ProjectUsersList
          :users="Object.values(users)"
          show-remove
          @remove="handleRemoveUser"
        />
      </div>
      <div v-else class="h-[300px]">
        <div class="flex flex-col items-center justify-center h-full">
          <i-mdi-information-slab-circle-outline
            class="text-3xl text-blue-500"
          />
          <span class="text-lg tracking-wide text-primary">
            No users selected
          </span>
          <span class="text-sm text-gray-500">
            Select users to add to the protocol
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full justify-start gap-5">
        <va-button
          preset="primary"
          class="self-start flex-none"
          @click="reset"
          icon="restart_alt"
          :disabled="loading"
        >
          Reset
        </va-button>

        <va-button
          preset="secondary"
          class="flex-none ml-auto"
          @click="hide"
          color="secondary"
          :disabled="loading"
        >
          Cancel
        </va-button>

        <va-button
          class="flex-none"
          @click="addUsers"
          :disabled="!isValid"
          color="success"
          icon="add"
          :loading="loading"
        >
          {{
            isValid
              ? `Add ${maybePluralize(Object.values(users).length, "User")}`
              : "Add Users"
          }}
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
const users = ref({});
const loading = ref(false);

const isValid = computed(() => {
  return Object.keys(users.value).length > 0;
});

function show() {
  visible.value = true;
}
function hide() {
  visible.value = false;
  // reset();
}

function handleUserSelect(user) {
  users.value[user.username] = user;
}

function handleRemoveUser(user) {
  delete users.value[user.username];
}

function reset() {
  users.value = {};
}

function addUsers() {
  if (!isValid.value) return;
  loading.value = true;
  protocolService
    .addUsers(
      props.protocol.id,
      Object.values(users.value).map((user) => user.id),
    )
    .then(() => {
      toast.success("Users added to protocol");
      emit("update");
      reset();
      hide();
    })
    .catch((error) => {
      toast.error(error.message);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
