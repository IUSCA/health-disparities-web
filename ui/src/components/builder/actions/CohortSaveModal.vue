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
import { transformQueryForApi } from "@/components/builder/queryBuilder/cohortQueryBuilder";
import config from "@/config";
import cohortService from "@/services/cohort2";
import toast from "@/services/toast";
import { useCohortsStore } from "@/stores/cohorts";
import { useForm } from "vuestic-ui";

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const props = defineProps({
  cohort: Object,
});

const emit = defineEmits(["save"]);

const cohortsStore = useCohortsStore();

const name = ref(props.cohort.name);
const description = ref("");
const is_published = ref(false);
const is_locked = ref(false);
const visible = ref(false);
const loading = ref(false);
const { isValid, validate } = useForm("formRef");

watch([() => props.cohort.name], () => {
  name.value = props.cohort.name;
});

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

// TODO
function handleSave() {
  const cohort_data = {
    name: name.value,
    description: description.value,
    is_published: is_published.value,
    is_locked: is_locked.value,
    query: {
      ...config.cohort.phenotype_schema,
      query: transformQueryForApi(props.cohort.query),
    },
  };
  if (validate()) {
    loading.value = true;
    (cohortsStore.isNewCohort(props.cohort)
      ? cohortService.create(cohort_data)
      : cohortService.update(props.cohort.id, cohort_data)
    )
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
