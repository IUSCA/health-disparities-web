<template>
  <va-modal
    v-model="visible"
    title="Download cohort's data"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
  >
    <VaInnerLoading :loading="loading">
      <div class="mb-5">
        <div v-if="!request">
          <!-- no previous request -->
          <p class="mb-2">
            You do not have access to download the cohort's data. Please request
            access to proceed.
          </p>
          <CohortRequestFormButton
            :cohort="cohort"
            :user="auth.user"
            :create-request="true"
            @done="hide"
          />
        </div>
        <div v-else>
          <div v-if="request.status === 'PENDING'">
            <p class="mb-2">
              Your request to download the cohort's data is being processed.
              Please wait for approval.
            </p>
            <CohortRequestFormButton
              :cohort="cohort"
              :user="auth.user"
              :create-request="false"
              @done="hide"
            />
          </div>
          <div v-else-if="request.status === 'APPROVED'">
            <p>
              Your request to download the cohort's data has been approved.
              Please follow the
              <a href="" target="_blank">
                <span class="items-center inline-flex mx-0.5 underline">
                  <span> instructions </span>
                  <i-mdi-open-in-new class="text-xs ml-0.5" />
                </span>
              </a>
              to complete the download.
            </p>
          </div>
          <div v-else-if="request.status === 'REJECTED'">
            <span>
              Unfortunately, your request to download the cohort's data was
              rejected. Please
              <a class="va-link" :href="`mailto:${config.contact.app_admin}`">
                contact the operators
              </a>
              for more information.
            </span>
          </div>
          <div v-else>
            <!-- unknown status -->
          </div>
        </div>
      </div>

      <VaDivider class="mb-5" />

      <CohortFilesSummary :id="cohort.id" />
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import requestService from "@/services/cohort_access_requests";

import config from "@/config";
import toast from "@/services/toast";
import { is404 } from "@/services/utils";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
const loading = ref(false);
const cohort = ref(null);
const request = ref(null);

function hide() {
  visible.value = false;
  cohort.value = null;
  loading.value = false;
}

function show(_cohort) {
  cohort.value = _cohort;
  visible.value = true;
}

watch(cohort, () => {
  if (!cohort.value) return;
  loading.value = true;
  requestService
    .getByCohortForSelf(cohort.value.id)
    .then((res) => {
      request.value = res.data;
    })
    .catch((err) => {
      if (is404(err)) {
        request.value = null;
      } else {
        toast.error("Failed to load request.");
        hide();
      }
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>
