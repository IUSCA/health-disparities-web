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
        <!-- upstream record id -->
        <!-- <div class="flex flex-col gap-1">
          <VaInput
            v-model="upstreamRecordId"
            label="REDCap Record ID"
            placeholder="Enter the REDCap record ID"
            clearable
          />
          <p class="text-sm va-text-secondary">
            This is the record ID of this request in REDCap.
          </p>
        </div> -->

        <!-- select expires_at: custom component - optional, default today -->
        <div
          v-if="originalRequest?.status !== 'APPROVED'"
          class="flex flex-col gap-1 my-3"
        >
          <div class="flex items-center gap-2 justify-between">
            <VaDateInput
              v-model="expiresAt"
              label="Expiration Date"
              placeholder="Click here to select a date"
              class="max-w-xs"
              :disabled="neverExpires"
              :allowedDays="(date) => date.getTime() > Date.now()"
            />

            <!-- Never expires checkbox -->
            <VaCheckbox
              v-model="neverExpires"
              label="Request never expires"
              class="mt-3"
            />
          </div>

          <p class="text-sm va-text-secondary">
            <span v-if="expiresAt">
              Request will expire in {{ datetime.fromNow(expiresAt) }} ({{
                datetime.displayDateTime(expiresAt)
              }})
            </span>
            <span v-else> Request never expires </span>
          </p>
        </div>

        <!-- notes: textarea -->
        <VaTextarea
          v-model="notes"
          label="Notes"
          placeholder="Enter notes for the request"
          :min-rows="3"
          :max-rows="5"
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
        <VaButton @click="hide" preset="secondary" color="secondary"
          >Cancel
        </VaButton>
        <VaButton @click="submit" color="success"> Edit Request </VaButton>
      </div>
    </VaInnerLoading>
  </VaModal>
</template>

<script setup>
import cohortAccessRequestService from "@/services/cohort_access_requests";
import * as datetime from "@/services/datetime";
import { useForm } from "vuestic-ui/web-components";

const emit = defineEmits(["updated"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const { validate } = useForm("formRef");

// const props = defineProps({});

const expiresAt = ref();
const notes = ref();
const upstreamRecordId = ref();
const neverExpires = ref(false);

// if original request has expires_at as null, set it to true, else false
// if

function getMidnightNextDay() {
  const now = new Date();
  const midnightNextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return midnightNextDay;
}

watch(neverExpires, (val) => {
  if (val) {
    expiresAt.value = null;
  } else {
    expiresAt.value = getMidnightNextDay();
  }
});

const visible = ref(false);
const loading = ref(false);
const originalRequest = ref(null);

function setState() {
  if (originalRequest.value) {
    expiresAt.value = originalRequest.value.expires_at;
    neverExpires.value = originalRequest.value.expires_at === null;
    notes.value = originalRequest.value.notes;
    upstreamRecordId.value = originalRequest.value.upstream_record_id;
  } else {
    expiresAt.value = null;
    notes.value = null;
    upstreamRecordId.value = null;
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
      expires_at: neverExpires.value ? null : expiresAt.value,
      notes: notes.value ? notes.value : null,
      // upstream_record_id: upstreamRecordId.value,
      version: originalRequest.value.version,
    })
    .then((res) => {
      emit("updated", res.data);
      hide();
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
