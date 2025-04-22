<template>
  <div v-if="props.request">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <!-- requester -->
      <div>
        <div class="va-text-secondary text-sm">Requester</div>
        <div class="">
          {{ props.request.requester.name }} ({{
            props.request.requester.email
          }})
        </div>
      </div>

      <!-- cohort -->
      <div>
        <div class="va-text-secondary text-sm">Cohort</div>
        <div class="">
          <RouterLink
            :to="cohortService.getCohortURL({ id: props.request.cohort.id })"
            class="va-link"
          >
            {{ props.request.cohort.name }}
          </RouterLink>
        </div>
      </div>

      <!-- created -->
      <div>
        <div class="va-text-secondary text-sm">Request Date</div>
        <div class="">
          {{ datetime.date(props.request.created_at) }}
        </div>
      </div>

      <!-- status -->
      <div>
        <div class="va-text-secondary text-sm">Status</div>
        <div class="flex items-center">
          <AccessRequestStatus :request="props.request" show-decision-date />
          <VaButton
            size="small"
            color="info"
            class="ml-3"
            icon="play_arrow"
            preset="primary"
            round
            @click="emit('continue')"
            v-if="
              props.showContinueButton && props.request.status === 'INITIATED'
            "
          >
            <div class="flex items-center gap-1">
              <span> Continue Access Request </span>
              <i-mdi-open-in-new class="text-xs" />
            </div>
          </VaButton>
        </div>
      </div>

      <!-- <div v-if="props.request.status !== 'PENDING' && props.request.reviewer">
        <div class="va-text-secondary text-sm">Reviewed By</div>
        <div class="">{{ props.request.reviewer.name }}</div>
      </div> -->

      <!-- last synced at -->
      <div v-if="props.adminView">
        <div class="va-text-secondary text-sm">Last Synced At</div>
        <div class="" v-if="props.request.last_synced_at">
          {{ datetime.date(props.request.last_synced_at) }}
        </div>
        <div v-else>
          <span class="">Not yet synced</span>
        </div>
      </div>

      <!-- upstream record id -->
      <div v-if="props.adminView">
        <div class="va-text-secondary text-sm">Upstream Record ID</div>
        <div class="">
          {{ props.request.upstream_record_id || "Not yet synced" }}
        </div>
      </div>

      <!-- expires at -->
      <div
        v-if="
          props.adminView &&
          ['PENDING', 'APPROVED'].includes(props.request.status)
        "
      >
        <div class="va-text-secondary text-sm">Expires At</div>
        <div class="" v-if="props.request.expires_at">
          {{ datetime.date(props.request.expires_at) }}
        </div>
        <div v-else>
          <span class=""> Never </span>
        </div>
      </div>
    </div>

    <!-- notes; may be long text; show neatly -->
    <div class="mb-4" v-if="props.adminView || props.request.notes">
      <div class="va-text-secondary text-sm">Notes</div>
      <div class="text-sm max-h-24 overflow-y-auto">
        <span v-if="!props.request.notes || props.request.notes.length === 0">
          No notes provided.
        </span>
        <span v-else> {{ props.request.notes }} </span>
        {{ props.request.notes }}
      </div>
    </div>
  </div>
</template>

<script setup>
import cohortService from "@/services/cohorts";
import * as datetime from "@/services/datetime";

const props = defineProps({
  request: {
    type: Object,
    required: true,
  },
  showContinueButton: {
    type: Boolean,
    default: false,
  },
  adminView: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["continue"]);
</script>

<style scoped></style>
