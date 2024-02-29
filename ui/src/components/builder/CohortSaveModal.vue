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
    <VaForm ref="formRef" class="flex flex-col gap-3 max-w-lg">
      <VaInput
        v-model="_name"
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
        v-model="published"
        label="Publish Cohort"
        description="Make this cohort public so that others can see it."
      />
    </VaForm>
    <div class="flex justify-end gap-3">
      <VaButton preset="secondary" @click="hide">Cancel</VaButton>
      <VaButton @click="handleSave" :disabled="!isValid">Save</VaButton>
    </div>
  </va-modal>
</template>

<script setup>
import cohortService from "@/services/cohort2";
import toast from "@/services/toast";
import { useForm } from "vuestic-ui";

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const props = defineProps({
  name: String,
  query: {
    type: [Object, null],
    required: true,
  },
});

const emit = defineEmits(["save"]);

const _name = ref(props.name);
const description = ref("");
const published = ref(false);
const visible = ref(false);
const loading = ref(false);
const { isValid, validate } = useForm("formRef");

watch([() => props.name], () => {
  _name.value = props.name;
});

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handleSave() {
  const cohort_data = {
    name: _name.value,
    description: description.value,
    published: published.value,
    query: props.query,
  };
  if (validate()) {
    loading.value = true;
    cohortService
      .create(cohort_data)
      .then((res) => {
        emit("save", res.data);
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
