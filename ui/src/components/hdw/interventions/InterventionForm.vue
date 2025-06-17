<template>
  <div class="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
    <!-- Left Panel -->
    <div class="p-2 border rounded-lg col-span-1 md:col-span-8">
      <VaOptionList
        label="Choose a category"
        v-model="category"
        :options="categoryOptions"
        type="radio"
        text-by="label"
        value-by="value"
      />

      <div class="mt-4">
        <HDWDxSelect v-model="selected" v-if="category === 'dx'" />
        <ProcedureSelect
          v-model="selected"
          v-else-if="category === 'procedure'"
        />
      </div>
    </div>

    <!-- Right Panel -->
    <div class="p-2 border rounded-lg col-span-1 md:col-span-4">
      <VaForm ref="formRef" class="flex flex-col gap-3">
        <VaInput
          label="Name"
          placeholder="Enter intervention name"
          v-model="name"
          required-mark
          :rules="[(v) => !!v || 'Name is required']"
        />

        <VaTextarea
          label="Description"
          placeholder="Describe your intervention"
          v-model="description"
        />

        <div class="flex justify-center">
          <VaButton
            class="mr-2 flex-1 max-w-md"
            color="success"
            :disabled="loading || selected.length === 0 || !isValid"
            @click="createIntervention"
          >
            <div class="flex items-center">
              <i-mdi-plus class="mr-2" />
              <span> Create Intervention </span>
            </div>
          </VaButton>
        </div>
      </VaForm>
    </div>
  </div>
</template>

<script setup>
import interventionService from "@/services/hdw/interventions";
import { useForm } from "vuestic-ui";

// const props = defineProps({});
const { isValid, validate } = useForm("formRef");

const emit = defineEmits(["create"]);

const formRef = ref(null);
const loading = ref(false);
const name = ref("");
const description = ref("");
const selected = ref([]);
const category = ref("dx");

const categoryOptions = [
  { label: "Diagnosis", value: "dx" },
  { label: "Procedure", value: "procedure" },
];

watch(category, () => {
  selected.value = [];
});

function createIntervention() {
  validate();
  if (!isValid.value) return;
  loading.value = true;
  interventionService
    .create({
      name: name.value,
      description: description.value,
      category: category.value,
      concept_ids: selected.value.map((item) => item.id),
    })
    .then((res) => {
      console.log("res", res);
      emit("create");
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
