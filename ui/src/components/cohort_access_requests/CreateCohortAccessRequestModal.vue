<template>
  <VaModal
    v-model="visible"
    title="Create Cohort Access Request"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    no-esc-dismiss
  >
    <VaInnerLoading :loading="loading">
      <VaForm class="flex flex-col gap-3 max-w-xl" ref="formRef">
        <!-- select cohort -->
        <VaInput
          v-model="cohortName"
          label="Cohort"
          readonly
          placeholder="Click here to select a cohort"
          @click="cohortSearchModal.show()"
          class="cursor-pointer"
          :rules="[(v) => !!v || 'Field is required']"
        >
          <template #prependInner>
            <i-mdi-account-multiple />
          </template>

          <template #appendInner>
            <VaButton
              @click.stop="cohort = null"
              preset="plain"
              color="danger"
              v-if="cohort"
            >
              <i-mdi-close />
            </VaButton>
          </template>
        </VaInput>

        <!-- select requester -->
        <VaFormField
          v-model="requester"
          :rules="[(v) => !!v || 'Field is required']"
        >
          <UserSelectInput
            v-model="requester"
            label="Requester"
            placeholder="Click here to select a requester"
          />
        </VaFormField>

        <!-- select status (dropdown) -->
        <VaSelect
          v-model="status"
          :options="statusOptions"
          label="Status"
          :rules="[(v) => !!v || 'Field is required']"
        >
          <template #prependInner>
            <i-mdi-information-outline />
          </template>
        </VaSelect>

        <!-- select decision_date: custom component - optional, default today -->
        <VaDateInput
          v-model="decisionDate"
          label="Decision Date"
          placeholder="Click here to select a date"
        />

        <!-- notes: textarea -->
        <VaTextarea
          v-model="notes"
          label="Notes"
          placeholder="Enter notes for the request"
          :min-rows="3"
          :max-rows="5"
        />

        <CohortSearchModal
          ref="cohortSearchModal"
          @select="(c) => (cohort = c)"
        />
      </VaForm>

      <!-- reset, cancel, submit buttons -->
      <div class="flex justify-end gap-2 mt-3">
        <VaButton
          @click="reset"
          preset="primary"
          icon="refresh"
          class="mr-auto"
        >
          Reset
        </VaButton>
        <VaButton @click="hide" preset="secondary">Cancel</VaButton>
        <VaButton @click="submit" color="success"> Create Request </VaButton>
      </div>
    </VaInnerLoading>
  </VaModal>
</template>

<script setup>
import cohortAccessRequestService from "@/services/cohort_access_requests";
import { useForm } from "vuestic-ui/web-components";

const emit = defineEmits(["created"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const { validate } = useForm("formRef");

// const props = defineProps({});
const cohort = ref(null);
const requester = ref(null);
const decisionDate = ref();
const notes = ref(null);
const status = ref("PENDING");

const cohortSearchModal = ref(null);
const visible = ref(false);
const loading = ref(false);

const statusOptions = ["PENDING", "APPROVED", "REJECTED"];

const cohortName = computed(() => {
  return cohort.value ? `${cohort.value.name} (${cohort.value.size})` : null;
});

function reset() {
  cohort.value = null;
  requester.value = null;
  decisionDate.value = new Date();
  notes.value = null;
  status.value = "PENDING";
}

function hide() {
  visible.value = false;
}

function show() {
  visible.value = true;
}

function submit() {
  if (!validate()) {
    return;
  }
  loading.value = true;
  cohortAccessRequestService
    .create({
      cohort_id: cohort.value.id,
      requester_id: requester.value.id,
      status: status.value,
      decision_date: decisionDate.value,
      notes: notes.value,
    })
    .then((res) => {
      emit("created", res.data);
      hide();
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
