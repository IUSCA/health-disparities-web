<template>
  <va-modal
    v-model="visible"
    title="Save Cohort"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    class="z-10"
  >
    <VaInnerLoading :loading="loading">
      <VaForm ref="formRef" class="flex flex-col gap-3 max-w-xl">
        <VaInput
          v-model="data.name"
          label="Name"
          required
          placeholder="Enter a name for the cohort"
          :rules="[(v) => !!v || 'Name is required']"
          inner-label
        />
        <VaTextarea
          v-model="data.description"
          label="Description"
          placeholder="Enter a description for the cohort"
          inner-label
          :max-rows="5"
        />
        <div class="flex flex-col gap-1">
          <VaCheckbox
            v-model="data.is_published"
            label="Publish Cohort"
            :disabled="props.cohort.is_locked"
          />
          <span class="text-sm va-text-secondary pl-7">
            Make this cohort public so that others can use it. Publishing the
            cohort will also lock it.
          </span>
        </div>

        <div class="flex flex-col gap-1">
          <VaCheckbox
            v-model="data.is_locked"
            label="Lock Cohort"
            :disabled="props.cohort.is_locked || data.is_published"
          />
          <span class="text-sm va-text-secondary pl-7"
            >Freeze the cohort so that it cannot be modified.</span
          >
        </div>
      </VaForm>
      <div class="flex justify-end gap-3">
        <VaButton preset="secondary" @click="hide">Cancel</VaButton>
        <VaButton @click="handleSave" :disabled="!isValid">Save</VaButton>
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import { Cohort } from "@/components/builder/models";
import toast from "@/services/toast";

import { useForm } from "vuestic-ui";

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const props = defineProps({
  cohort: Cohort,
});

const emit = defineEmits(["save"]);

const data = ref({
  name: props.cohort.name || "",
  description: props.cohort.description || "",
  is_published: props.cohort.is_published || false,
  is_locked: props.cohort.is_locked || false,
});

const visible = ref(false);
const loading = ref(false);
const { isValid, validate } = useForm("formRef");

// watch([() => props.cohort.name], () => {
//   data.value.name = props.cohort.name;
// });
// watch([() => props.cohort.description], () => {
//   data.value.description = props.cohort.description;
// });
// watch([() => props.cohort.is_published], () => {
//   data.value.is_published = props.cohort.is_published;
// });
// watch([() => props.cohort.is_locked], () => {
//   data.value.is_locked = props.cohort.is_locked;
// });

// is_locked should be true if is_published is true and cannot be changed
// when is_published is false, is_locked can be toggled
watch(
  () => data.value.is_published,
  (value) => {
    data.value.is_locked = value;
  },
);

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}

// TODO
function handleSave() {
  if (validate()) {
    loading.value = true;
    props.cohort
      .save(data.value)
      .then(() => {
        emit("save");
        hide();
      })
      .catch((error) => {
        console.error("error saving", error);
        toast.error("Error saving cohort");
      })
      .finally(() => {
        loading.value = false;
      });
  }
}
</script>
