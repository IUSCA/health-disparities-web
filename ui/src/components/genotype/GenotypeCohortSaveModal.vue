<template>
  <va-modal
    v-model="visible"
    title="Save Cohort"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
  >
    <VaForm ref="formRef" class="flex flex-col gap-3 max-w-lg">
      <VaInput
        v-model="name"
        label="Name"
        required
        placeholder="Enter a name for the cohort"
        :rules="[(v) => !!v || 'Name is required']"
        inner-label
      />
      <VaTextarea
        v-model="description"
        label="Description"
        placeholder="Enter a description for the cohort"
        inner-label
        :max-rows="5"
      />
      <VaCheckbox
        v-model="is_published"
        label="Publish Cohort"
        description="Make this cohort public so that others can see it. Publishing the cohort will also lock it."
      />
      <VaCheckbox
        v-model="is_locked"
        label="Lock Cohort"
        description="Freeze the cohort so that it cannot be modified."
      />
    </VaForm>
    <div class="flex justify-end gap-3">
      <VaButton preset="secondary" @click="hide">Cancel</VaButton>
      <VaButton @click="handleSave" :disabled="!isValid">Save</VaButton>
    </div>
  </va-modal>
</template>

<script setup>
import { useForm } from "vuestic-ui";
defineExpose({
  show,
  hide,
});

// const props = defineProps({
//   cohort: Object,
// });

const emit = defineEmits(["save"]);

const name = ref("");
const description = ref("");
const is_published = ref(false);
const is_locked = ref(false);
const visible = ref(false);
const { isValid, validate } = useForm("formRef");

// watch([() => props.cohort.name], () => {
//   name.value = props.cohort.name;
// });

watch(is_published, (value) => {
  if (value) {
    is_locked.value = true;
  }
});

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handleSave() {
  if (validate()) {
    const cohort = {
      name: name.value,
      description: description.value,
      is_published: is_published.value,
      is_locked: is_locked.value,
    };
    emit("save", cohort);
    hide();
  }
}
</script>
