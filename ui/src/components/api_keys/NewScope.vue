<template>
  <VaInnerLoading :loading="loading">
    <VaForm ref="formRef" class="flex flex-col gap-3 max-w-xl">
      <VaInput
        v-model="data.name"
        label="Name"
        readonly
        placeholder="Auto-generated from resource and action"
      />
      <VaInput
        v-model="data.action"
        label="Action"
        placeholder="Enter an action. e.g. 'read', 'write', 'manage'"
        :rules="[(v) => !!v || 'Action is required']"
      />
      <VaInput
        v-model="data.resource"
        label="Resource"
        placeholder="Enter a resource. e.g. 'participants', 'cohorts'"
        :rules="[(v) => !!v || 'Resource is required']"
      />
      <VaTextarea
        v-model="data.description"
        label="Description"
        placeholder="Enter a description for the scope"
        :max-rows="5"
      />
    </VaForm>

    <!-- Actions: Save, Cancel -->
    <div>
      <div class="flex justify-end gap-3">
        <VaButton preset="secondary" @click="emit('cancel')">Cancel</VaButton>
        <VaButton @click="handleSave" :disabled="!isValid" color="success">
          Save
        </VaButton>
      </div>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
import { useForm } from "vuestic-ui";

const emit = defineEmits(["created"]);

const { isValid, validate } = useForm("formRef");

const data = ref({
  action: "",
  resource: "",
  description: "",
});
const loading = ref(false);

// watch changes and set name as action:resource
watch(
  () => [data.value.action, data.value.resource],
  ([action, resource]) => {
    if (action === "" || resource === "") {
      data.value.name = "";
      return;
    }
    data.value.name = `${action}:${resource}`;
  },
);

const handleSave = async () => {
  if (!validate()) {
    return;
  }
  loading.value = true;
  apiKeyService
    .createScope(data.value)
    .then((res) => {
      emit("created", res.data);
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>
