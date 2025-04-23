<template>
  <va-modal
    v-model="visible"
    title="Create a New Protocol"
    fixed-layout
    hide-default-actions
  >
    <va-inner-loading :loading="loading">
      <va-form class="flex flex-col flex-nowrap gap-3 max-w-2xl" ref="formRef">
        <va-input
          v-model="data.name"
          label="Name"
          :rules="[(v) => !!v || 'Name is required']"
        />
        <va-textarea
          class="w-full"
          v-model="data.description"
          label="Description"
          :min-rows="1"
          :max-rows="5"
          :max-length="1000"
          counter
          :rules="[
            (v) => !!v || 'Description is required',
            (v) => (v?.length || 0) <= 1000 || 'Description is too long',
          ]"
        />
      </va-form>
    </va-inner-loading>
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
          :disabled="loading"
        >
          Cancel
        </va-button>

        <va-button
          class="flex-none"
          @click="create"
          :disabled="!isValid"
          icon="add"
          color="success"
          :loading="loading"
        >
          Create
        </va-button>
      </div>
    </template>
  </va-modal>
</template>

<script setup>
import protocolService from "@/services/protocols";
import { useForm } from "vuestic-ui";

const props = defineProps({
  redirect: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["create"]);
const router = useRouter();

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const loading = ref(false);
const visible = ref(false);

const { isValid, validate } = useForm("formRef");

const data = ref({
  name: "",
  description: "",
});

function hide() {
  loading.value = false;
  visible.value = false;
  data.value = {
    name: "",
    description: "",
  };
}

function show() {
  visible.value = true;
}

function create() {
  if (validate()) {
    loading.value = true;

    protocolService
      .create(data.value)
      .then((res) => {
        const protocol_id = res.data.id;
        // navigate to the new protocol page
        if (props.redirect) router.push(`/protocols/${protocol_id}`);
      })
      .catch((err) => {
        // todo show toast
        console.error("server error", err);
      })
      .finally(() => {
        loading.value = false;
        emit("create");
        hide();
      });
  }
}

function reset() {
  data.value = {
    name: "",
    description: "",
  };
}
</script>
