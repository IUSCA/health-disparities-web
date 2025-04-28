<template>
  <VaInnerLoading :loading="loading">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2" v-if="request">
      <!-- details -->
      <div class="md:col-span-2">
        <VaCard class="min-h-[388px]">
          <VaCardTitle>
            <div class="flex flex-nowrap items-center w-full">
              <span class="flex-auto text-lg"> Details </span>
              <!-- <AddEditButton class="flex-none" edit @click="openModalToEdit" /> -->
            </div>
          </VaCardTitle>
          <VaCardContent>
            <AccessRequest :request="request" :admin-view="auth.canOperate" />
          </VaCardContent>
        </VaCard>
      </div>

      <!-- timeline -->
      <div>
        <VaCard>
          <VaCardTitle>
            <span class="text-lg"> Timeline </span>
          </VaCardTitle>
          <VaCardContent>
            <AccessRequestTimeline :request="request" />
          </VaCardContent>
        </VaCard>
      </div>

      <!-- actions -->
      <div class="col-span-full" v-if="auth.canOperate">
        <VaCard>
          <VaCardTitle>
            <span class="text-lg"> Actions </span>
          </VaCardTitle>
          <VaCardContent>
            <div class="flex flex-wrap items-center gap-3 mb-5">
              <p class="va-text-secondary font-semibold">Manage Status:</p>
              <!-- cancel request -->
              <VaButton
                v-if="request.allowed_transitions.includes('CANCELED')"
                @click="setRequestStatus('CANCELED')"
                preset="primary"
                color="danger"
                class="flex-none min-w-44"
                :disabled="loading"
              >
                <div class="flex items-center gap-1">
                  <Icon :icon="getIcon('CANCELED')" />
                  <span> Cancel Request </span>
                </div>
              </VaButton>

              <!-- mark as expired -->
              <VaButton
                v-if="request.allowed_transitions.includes('EXPIRED')"
                @click="setRequestStatus('EXPIRED')"
                preset="primary"
                class="flex-none min-w-44"
                :disabled="loading"
              >
                <div class="flex items-center gap-1">
                  <Icon :icon="getIcon('EXPIRED')" />
                  <span> Mark as Expired </span>
                </div>
              </VaButton>

              <!-- reactivate request -->
              <VaButton
                v-if="request.allowed_transitions.includes('PENDING')"
                @click="setRequestStatus('PENDING')"
                preset="primary"
                color="success"
                class="flex-none min-w-44"
                :disabled="loading"
              >
                <div class="flex items-center gap-1">
                  <i-mdi-refresh />
                  <span> Reactivate </span>
                </div>
              </VaButton>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <p class="va-text-secondary font-semibold">
                Other Actions: &nbsp;
              </p>
              <!-- sync -->
              <VaButton
                v-if="['INITIATED', 'PENDING'].includes(request.status)"
                @click="sync()"
                preset="primary"
                color="info"
                border-color="info"
                class="flex-none min-w-44"
                icon="sync"
                :disabled="loading"
              >
                Sync with REDCap
              </VaButton>

              <!-- Edit -->
              <VaButton
                @click="editModal.show(request)"
                preset="primary"
                border-color="primary"
                class="flex-none min-w-44"
                icon="edit"
                :disabled="loading"
              >
                Edit Request
              </VaButton>
            </div>
          </VaCardContent>
        </VaCard>
      </div>

      <!-- audit logs -->
      <div class="md:col-span-3" v-if="auth.canOperate">
        <VaCard>
          <VaCardTitle>
            <span class="text-lg"> Audit Logs </span>
          </VaCardTitle>
          <VaCardContent>
            <AuditLogs
              :logs="
                request?.audit_logs?.map((l) => ({
                  ...l,
                  user: l.changed_by,
                  summary: getAuditLogSummary(l),
                  comments:
                    (l.stage ? `Stage: ${l.stage.name}\n\n` : '') +
                    (l.reason || ''),
                }))
              "
              class="max-h-[calc(100vh-130px)] min-h-96 overflow-y-auto"
            />
          </VaCardContent>
        </VaCard>
      </div>
    </div>
    <div v-else-if="unauthorized">
      <div class="flex flex-col items-center justify-center h-full mt-10">
        <h1 class="text-2xl font-bold">Unauthorized</h1>
        <p class="mt-2 va-text-secondary">
          You do not have permission to view this request.
        </p>
        <!-- go back -->
        <VaButton
          class="mt-4"
          @click="navigateBackSafely(router, '/cohort_access_requests')"
          preset="primary"
          icon="arrow_back"
        >
          <div class="flex items-center gap-1">
            <span> Go Back </span>
          </div>
        </VaButton>
      </div>
    </div>
    <div v-else-if="notFound">
      <div class="flex flex-col items-center justify-center h-full mt-10">
        <h1 class="text-2xl font-bold">Not Found</h1>
        <p class="mt-2 va-text-secondary">
          The requested access request does not exist.
        </p>
        <!-- go back -->
        <VaButton
          class="mt-4"
          @click="navigateBackSafely(router, '/cohort_access_requests')"
          preset="primary"
          icon="arrow_back"
        >
          <div class="flex items-center gap-1">
            <span> Go Back </span>
          </div>
        </VaButton>
      </div>
    </div>
  </VaInnerLoading>
  <EditCohortAccessRequestModal ref="editModal" @updated="fetch_request" />
</template>

<script setup>
import { getIcon } from "@/components/cohort_access_requests/icons";
import router from "@/router";
import requestService from "@/services/cohort_access_requests";
import toast from "@/services/toast";
import { is403, is404, navigateBackSafely } from "@/services/utils";
import { useAuthStore } from "@/stores/auth";
import { useNavStore } from "@/stores/nav";
import { useModal } from "vuestic-ui";

const nav = useNavStore();
const auth = useAuthStore();
const { confirm } = useModal();

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const request = ref();
const loading = ref(false);
const editModal = ref();
// const showActions = ref(false);
const unauthorized = ref(false);
const notFound = ref(false);

watch(
  request,
  () => {
    nav.setNavItems([
      {
        label: "Access Requests",
        to: "/cohort_access_requests",
      },
      {
        label: request.value
          ? `"${request.value.cohort.name}" (${request.value.requester.name})`
          : props.id,
      },
    ]);
  },
  { immediate: true },
);

function fetch_request() {
  loading.value = true;
  const promise = auth.canOperate
    ? requestService.getById(props.id)
    : requestService.getByIdForSelf(props.id);
  return promise
    .then((res) => {
      request.value = res.data;
    })
    .catch((err) => {
      if (is403(err)) {
        unauthorized.value = true;
      } else if (is404(err)) {
        notFound.value = true;
      } else {
        throw err;
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetch_request();
});

function getModalDetails(status) {
  let message = `Are you sure you want to set the request status to "${status}"?`;
  let okText = "Yes";
  switch (status) {
    case "CANCELED": {
      message = "Are you sure you want to cancel the request?";
      okText = "Yes, Cancel.";
      break;
    }
    case "EXPIRED": {
      message = "Are you sure you want to mark the request as expired?";
      okText = "Yes, Mark as Expired.";
      break;
    }
    case "PENDING": {
      message =
        "Are you sure you want to reactivate the request? This will set the status to PENDING and will attempt to sync status from REDCap.";
      okText = "Yes, Reactivate.";
      break;
    }
    default: {
      break;
    }
  }
  return { message, okText };
}

function setRequestStatus(status) {
  const { message, okText } = getModalDetails(status);
  confirm({
    title: "Confirm Action",
    message,
    okText,
    cancelText: "No",
  }).then((ok) => {
    if (!ok) return;
    loading.value = true;
    requestService
      .update(props.id, {
        status,
        decision_date: new Date().toISOString(),
        version: request.value.version,
      })
      .then(() => {
        toast.success("Request status updated successfully");
        fetch_request();
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

function sync() {
  loading.value = true;
  requestService
    .sync(request.value.request_id)
    .then((res) => {
      const message = res.data?.message;
      toast.success("Sync successful" + (message ? `: ${message}` : ""));
      fetch_request();
    })
    .catch((err) => {
      toast.error("Error syncing request");
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
}

function getAuditLogSummary(log) {
  const { change_source, stage, old_data, new_data } = log;
  let summaryItems = [];
  if (change_source) {
    summaryItems.push(`Source: ${change_source.toUpperCase()}`);
  }
  if (stage) {
    summaryItems.push(`Stage: ${stage.id}`);
  }
  if (
    old_data?.status &&
    new_data?.status &&
    old_data.status !== new_data.status
  ) {
    summaryItems.push(`Status: ${old_data.status} to ${new_data.status}`);
  }
  return summaryItems.join(" | ");
}
</script>

<route lang="yaml">
meta:
  title: Access Request Details
</route>
