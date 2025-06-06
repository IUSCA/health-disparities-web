<template>
  <va-modal
    v-model="visible"
    title="Save Cohort"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
  >
    <VaInnerLoading :loading="loading">
      <VaForm ref="formRef" class="flex flex-col gap-3 max-w-xl">
        <VaInput
          v-model="data.name"
          label="Name"
          required
          placeholder="Enter a name for the cohort"
          :rules="[(v) => !!v || 'Name is required']"
        />
        <VaTextarea
          v-model="data.description"
          label="Description"
          placeholder="Enter a description for the cohort"
          :max-rows="5"
          :rules="[
            (v) => !!v || 'Description is required',
            (v) =>
              (v && v.length >= 10) ||
              'Description must be at least 10 characters',
          ]"
        />
      </VaForm>
      <div class="flex justify-end gap-3">
        <VaButton preset="secondary" @click="hide">Cancel</VaButton>
        <VaButton @click="handleSave" :disabled="!isValid" color="success">
          Save
        </VaButton>
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import { Cohort } from "@/components/cohorts/models";
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

const emit = defineEmits(["saved"]);

const data = ref({
  name: props.cohort.name || "",
  description: props.cohort.description || "",
});

const visible = ref(false);
const loading = ref(false);
const { isValid, validate } = useForm("formRef");

watch(
  () => props.cohort.suggested_name,
  (sg_name) => {
    if (sg_name)
      data.value.name = props.cohort.isNew() ? sg_name : props.cohort.name;
  },
  {
    immediate: true,
  },
);
watch(
  () => props.cohort.suggested_description,
  (sg_description) => {
    if (sg_description)
      data.value.description = props.cohort.isNew()
        ? sg_description
        : props.cohort.suggested_description;
  },
  {
    immediate: true,
  },
);

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handleSave() {
  if (validate()) {
    loading.value = true;
    props.cohort
      .save(data.value)
      .then(() => {
        emit("saved");
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
