<template>
  <VaModal
    v-model="visible"
    title="Edit Cohort Access Request"
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
          v-model="cohort.name"
          label="Cohort"
          readonly
          class="cursor-not-allowed"
        >
          <template #prependInner>
            <i-mdi-account-multiple />
          </template>
        </VaInput>

        <!-- select requester -->
        <VaInput
          v-model="requester.username"
          label="Requester"
          readonly
          class="cursor-not-allowed"
        >
          <template #prependInner>
            <i-mdi-account />
          </template>
        </VaInput>

        <!-- select reviewer -->
        <VaFormField
          v-model="reviewer"
          :rules="[(v) => !!v || 'Field is required']"
        >
          <UserSelectInput
            v-model="reviewer"
            label="Reviewer"
            placeholder="Click here to select a reviewer"
            icon="mdi:account-tie-hat"
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
          clearable
        />

        <!-- notes: textarea -->
        <VaTextarea
          v-model="notes"
          label="Notes"
          placeholder="Enter notes for the request"
          :min-rows="3"
          :max-rows="5"
          :rules="[(v) => !!v || 'Field is required']"
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
        <VaButton @click="submit" color="success"> Edit Request </VaButton>
      </div>
    </VaInnerLoading>
  </VaModal>
</template>

<script setup>
import cohortAccessRequestService from "@/services/cohort_access_requests";
import { useAuthStore } from "@/stores/auth";
import { useForm } from "vuestic-ui/web-components";

const emit = defineEmits(["updated"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const authStore = useAuthStore();
const { validate } = useForm("formRef");

// const props = defineProps({});
const cohort = ref(null);
const requester = ref(null);
const reviewer = ref(null);
const decisionDate = ref();
const notes = ref(null);
const status = ref("PENDING");

const visible = ref(false);
const loading = ref(false);
const originalRequest = ref(null);

const statusOptions = ["PENDING", "APPROVED", "REJECTED"];

// const cohortName = computed(() => {
//   return cohort.value ? `${cohort.value.name} (${cohort.value.size})` : null;
// });

function setState() {
  if (originalRequest.value) {
    cohort.value = originalRequest.value.cohort;
    requester.value = originalRequest.value.requester;
    reviewer.value = originalRequest.value.reviewer || authStore.user;
    decisionDate.value = originalRequest.value.decision_date
      ? new Date(originalRequest.value.decision_date)
      : null;
    notes.value = originalRequest.value.notes;
    status.value = originalRequest.value.status;
  } else {
    cohort.value = null;
    requester.value = null;
    reviewer.value = null;
    decisionDate.value = null;
    notes.value = null;
    status.value = "PENDING";
  }
}

function reset() {
  setState();
}

function hide() {
  originalRequest.value = null;
  setState();
  visible.value = false;
}

function show(request) {
  originalRequest.value = request;
  setState();
  visible.value = true;
}

function submit() {
  if (!validate()) {
    return;
  }
  loading.value = true;
  cohortAccessRequestService
    .update(originalRequest.value.id, {
      reviewer_id: reviewer.value.id || null,
      status: status.value,
      decision_date: decisionDate.value || null,
      notes: notes.value || null,
    })
    .then((res) => {
      emit("updated", res.data);
      hide();
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      loading.value = false;
    });
}

watch(status, (newStatus) => {
  if (newStatus === "REJECTED" || newStatus === "APPROVED") {
    if (!decisionDate.value) {
      decisionDate.value = new Date();
    }
  }
});
</script>
