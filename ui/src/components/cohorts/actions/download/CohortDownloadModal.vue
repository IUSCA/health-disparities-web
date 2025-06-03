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
      <!-- cohort is PRIVATE -->
      <div v-if="cohort.visibility === CV.PRIVATE">
        <VaAlert color="info" outline>
          <div class="mb-4">
            <p>
              To download this cohort's data, you must first request access.
              <br />
              <strong>Before requesting access:</strong>
            </p>
            <ul class="list-disc ml-6 my-2 text-left">
              <li>
                The cohort will be <b>locked</b> and cannot be edited anymore.
              </li>
              <li>
                The cohort's visibility will change from <b>PRIVATE</b> to
                <b>UNLISTED</b> so reviewers can access it.
                <br />
                <span class="text-xs text-gray-500">
                  (Anyone with the link will be able to view it, but it will not
                  appear in search results.)
                </span>
              </li>
            </ul>
          </div>
          <div class="flex flex-col items-center gap-4">
            <VaCheckbox
              v-model="acknowledgeLock"
              :disabled="loading"
              class="mb-2"
              label="I understand this action will lock the cohort and make it unlisted."
            />
            <VaButton
              color="primary"
              :disabled="!acknowledgeLock || loading"
              :loading="loading"
              @click="onChangeVisibilityAndRequest"
              size="large"
            >
              Change Visibility &amp; Request Access
            </VaButton>
          </div>
        </VaAlert>
      </div>
      <!-- cohort is UNLISTED or PUBLIC -->
      <div class="" v-else>
        <!-- no previous request -->
        <div v-if="!request">
          <VaAlert color="secondary" outline>
            <p class="text-center mx-auto mb-4">
              You do not have access to download the cohort's data. Please
              request access to proceed.
            </p>

            <!-- Request Access -->
            <div class="flex justify-center w-full">
              <VaButton
                @click="onOpenForm"
                preset="primary"
                :loading="loading"
                :disabled="loading"
                class="flex-none"
                size="large"
              >
                <div class="flex items-center gap-1">
                  <span> Request Access </span>
                  <i-mdi-open-in-new />
                </div>
              </VaButton>
            </div>

            <p class="mt-4 text-center text-sm">
              <RouterLink
                to="/cohort_access_requests"
                class="va-link va-text-secondary"
              >
                View all your access requests
              </RouterLink>
            </p>
          </VaAlert>
        </div>

        <!-- request exists and is active: initiated, pending -->
        <div v-else-if="requestService.isActive(request)">
          <div class="mb-6 flex items-center justify-start gap-2">
            <p>
              You have an
              <RouterLink
                :to="`/cohort_access_requests/${request.id}`"
                class="va-link"
              >
                active request
              </RouterLink>
              to download the cohort's data.
            </p>
            <p class="text-right text-sm">
              <RouterLink
                to="/cohort_access_requests"
                class="va-link va-text-secondary"
              >
                View all your access requests
              </RouterLink>
            </p>
          </div>

          <AccessRequest
            :request="request"
            show-continue-button
            @continue="onOpenForm({ shouldCreateRequest: false })"
          />

          <VaCollapse
            v-model="progressCollapseValue"
            header="Review Progress"
            v-if="request.status !== 'INITIATED'"
          >
            <AccessRequestTimeline :request="request" />
          </VaCollapse>

          <!-- <div class="mb-12"></div> -->
        </div>

        <!-- request approved -->
        <div v-else-if="request.status === 'APPROVED'">
          <VaAlert color="success" outline>
            <p class="text-center max-w-lg mx-auto">
              Your
              <RouterLink
                :to="`/cohort_access_requests/${request.id}`"
                class="va-link"
                >request</RouterLink
              >
              to download the cohort's data has been approved. Please follow the
              <a href="" target="_blank">
                <span class="items-center inline-flex mx-0.5 underline">
                  <span> instructions </span>
                  <i-mdi-open-in-new class="text-xs ml-0.5" />
                </span>
              </a>
              to complete the download.
            </p>
          </VaAlert>
        </div>

        <!-- request exists but is not active / approved: rejected, canceled, etc -->
        <div v-else>
          <VaAlert color="secondary" outline>
            <div class="text-center max-w-xl mx-auto mb-4">
              Your
              <RouterLink
                :to="`/cohort_access_requests/${request.id}`"
                class="va-link"
              >
                previous request
              </RouterLink>
              to download the cohort's data was
              <span> {{ request.status }} </span>

              <span v-if="request.decision_date" class="">
                on {{ datetime.date(request.decision_date) }} </span
              >.
              <p>You can submit a new request.</p>
            </div>

            <!-- Request Access -->
            <div class="flex justify-center w-full">
              <VaButton
                @click="onOpenForm"
                preset="primary"
                :loading="loading"
                :disabled="loading"
                class="flex-none"
                size="large"
              >
                <div class="flex items-center gap-1">
                  <span> Request Access </span>
                  <i-mdi-open-in-new />
                </div>
              </VaButton>
            </div>

            <p class="mt-4 text-center text-sm">
              <RouterLink
                to="/cohort_access_requests"
                class="va-link va-text-secondary"
              >
                View all your access requests
              </RouterLink>
            </p>
          </VaAlert>
        </div>

        <VaCollapse v-model="summaryCollapseValue" header="Files Summary">
          <CohortFilesSummary :id="cohort.id" />
        </VaCollapse>
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import { CV } from "@/components/cohorts/models";
import requestService from "@/services/cohort_access_requests";
import cohortService from "@/services/cohorts2";
import * as datetime from "@/services/datetime";
import { buildREDCapSurveyUrl } from "@/services/redcap";
import toast from "@/services/toast";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const emit = defineEmits(["update"]);

const visible = ref(false);
const loading = ref(false);
const cohort = ref(null);
const request = ref(null);
const acknowledgeLock = ref(false);

const summaryCollapseValue = ref(false);

// collapse: show request progress when request is in pending state
const progressCollapseValue = computed({
  get: () => ["PENDING"].includes(request.value?.status),
  set: (value) => value,
});

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
    .getAllForSelf({
      cohort_id: cohort.value.id,
      sortBy: "created_at",
      sortOrder: "desc",
    })
    .then((res) => {
      const requests = res.data.data;
      if (requests.length === 0) {
        request.value = null;
        return;
      } else {
        const activeRequests = requests.filter(requestService.isActive);
        if (activeRequests.length > 0) {
          request.value = activeRequests[0];
        } else {
          request.value = requests[0];
        }
      }
      // request.value = res.data;
    })
    .catch((err) => {
      console.error("Failed to load request.", err);
      toast.error("Failed to load request.");
      hide();
    })
    .finally(() => {
      loading.value = false;
    });
});

function onOpenForm({ shouldCreateRequest = true } = {}) {
  loading.value = true;
  const promise = shouldCreateRequest
    ? requestService.createForSelf(cohort.value.id)
    : Promise.resolve({
        data: request.value,
      });

  return promise
    .then((res) => {
      const newRequest = res.data;
      if (!newRequest) {
        toast.error("Failed to create cohort access request.");
        return;
      }
      window.open(
        buildREDCapSurveyUrl({
          user: auth.user,
          cohort: cohort.value,
          request_id: newRequest.request_id,
        }),
        "_blank",
      );
    })
    .catch((err) => {
      toast.error("Failed to create cohort access request.");
      console.error("Failed to create cohort access request.", err);
    })
    .finally(() => {
      loading.value = false;
      hide();
    });
}

function onChangeVisibilityAndRequest() {
  loading.value = true;
  cohortService
    .updateVisibility(cohort.value.id, CV.UNLISTED)
    .then(() => {
      onOpenForm().finally(() => {
        acknowledgeLock.value = false; // reset the checkbox
        emit("update");
      });
    })
    .catch((error) => {
      loading.value = false;
      toast.error(`Failed to change cohort visibility: ${error.message}`);
    });
}
</script>
