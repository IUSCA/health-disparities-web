<template>
  <va-modal v-model="visible" :title="title" fixed-layout hide-default-actions>
    <va-inner-loading :loading="loading" class="sm:w-96">
      <va-form class="flex flex-wrap gap-5 max-w-[350px]" ref="formRef">
        <va-input
          v-model="data.name"
          label="Name"
          :rules="[(v) => !!v || 'Field is required']"
        />
        <va-date-input
          v-model="data.date"
          label="Date"
          :rules="[(v) => !!v || 'Field is required']"
        />
        <va-textarea
          v-model="data.description"
          label="Description"
          autosize
          :min-rows="3"
          :max-rows="7"
          :max-length="1000"
          counter
          :rules="[(v) => (v?.length || 0) <= 1000]"
        />
        <va-checkbox
          v-model="data.published"
          label="Publish Snapshot?"
          left-label
        />
      </va-form>
    </va-inner-loading>
    <template #footer>
      <div class="flex w-full justify-center gap-5">
        <va-button preset="secondary" class="flex-none" @click="hide">
          Cancel
        </va-button>
        <va-button class="flex-none" @click="handle" :disabled="!isValid">
          {{ props.edit ? "Edit" : "Create" }}
        </va-button>
      </div>
    </template>
  </va-modal>
</template>

<script setup>
import { useForm } from "vuestic-ui";
import snapshotService from "@/services/snapshots";

const props = defineProps({
  edit: {
    type: Boolean,
    default: false,
  },
  snapshot: {
    type: Object,
    default: () => ({}),
  },
});
const emit = defineEmits(["update"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const loading = ref(false);
const visible = ref(false);

const { isValid, validate } = useForm("formRef");

const title = computed(() => {
  return props.edit ? "Edit Snapshot" : "Create Snapshot";
});

const data = ref({
  name: "",
  description: "",
  date: null,
  published: false,
});

watch([() => props.snapshot, () => props.edit], () => {
  if (props.edit) {
    const { name, description, date, published } = props.snapshot;
    data.value = { name, description, date, published };
  }
});

function hide() {
  loading.value = false;
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handle() {
  if (validate()) {
    loading.value = true;

    const promise = props.edit
      ? snapshotService.update(props.snapshot.id, data.value)
      : snapshotService.create(data.value);
    promise
      .catch((err) => {
        // todo show toast
        console.error("server error", err);
      })
      .finally(() => {
        loading.value = false;
        emit("update");
        hide();
      });
  }
}
</script>
