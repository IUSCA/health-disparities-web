<template>
  <VaInnerLoading :loading="loading">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" v-if="request">
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

      <div class="col-span-full" v-if="showActions">
        <VaCard>
          <VaCardTitle>
            <span class="text-lg"> Actions </span>
          </VaCardTitle>
          <VaCardContent>
            <div class="flex gap-3">
              <!-- cancel request -->
              <VaButton
                v-if="request.allowed_transitions.includes('CANCELED')"
                @click="setRequestStatus('CANCELED')"
                preset="danger"
                class="flex-none"
                icon="cancel"
                :loading="loading"
                :disabled="loading"
              >
                <div class="flex items-center gap-1">
                  <span> Cancel Request </span>
                </div>
              </VaButton>

              <!-- mark as expired -->
              <VaButton
                v-if="request.allowed_transitions.includes('EXPIRED')"
                @click="setRequestStatus('EXPIRED')"
                preset="danger"
                class="flex-none"
                icon="cancel"
                :loading="loading"
                :disabled="loading"
              >
                <div class="flex items-center gap-1">
                  <span> Mark as Expired </span>
                </div>
              </VaButton>

              <!-- sync now -->
              <VaButton
                @click="setRequestStatus('SYNCED')"
                preset="primary"
                class="flex-none"
                icon="sync"
                :loading="loading"
                :disabled="loading"
              >
                <div class="flex items gap-1">
                  <span> Sync Now </span>
                </div>
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
                  comments: l.reason,
                }))
              "
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
import router from "@/router";
import requestService from "@/services/cohort_access_requests";
import { is403, is404, navigateBackSafely } from "@/services/utils";
import { useAuthStore } from "@/stores/auth";
import { useNavStore } from "@/stores/nav";

const nav = useNavStore();
const auth = useAuthStore();

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const request = ref();
const loading = ref(false);
// const editModal = ref();
const showActions = ref(false);
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
          ? `"${request.value.requester.name}" → "${request.value.cohort.name}"`
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

// function openModalToEdit() {
//   if (!request.value) return;
//   editModal.value.show(request.value);
// }
</script>

<route lang="yaml">
meta:
  title: Access Request Details
</route>
