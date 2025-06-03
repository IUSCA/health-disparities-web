<template>
  <va-modal
    v-model="visible"
    title="Change Cohort Visibility"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
  >
    <VaInnerLoading :loading="loading">
      <div>
        <p class="mb-4">
          You are about to change the visibility of the cohort
          <strong>{{ cohort?.name }}</strong
          >.
        </p>

        <div class="mb-4">
          <label for="visibility-select" class="block mb-2"
            >Select New Visibility:</label
          >
          <VaRadio
            v-model="selectedVisibility"
            :options="cohort.allowed_transitions"
          >
          </VaRadio>
        </div>

        <p class="mb-4" v-if="selectedVisibility">
          This action will change the visibility of the cohort from
          <strong>{{ cohort?.visibility }}</strong> to
          <strong>{{ selectedVisibility }}</strong
          >.
        </p>

        <div v-if="transitionKey" class="mb-4">
          <p class="font-semibold">
            {{ transitionMessages[transitionKey]?.message }}
          </p>
        </div>
      </div>

      <!-- action buttons -->
      <div class="flex justify-end gap-3">
        <va-button @click="hide" :disabled="loading" preset="primary">
          Cancel
        </va-button>
        <va-button
          @click="onChange()"
          :disabled="loading || !selectedVisibility"
        >
          Change Visibility
        </va-button>
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import cohortService from "@/services/cohorts2";
import toast from "@/services/toast";

defineExpose({
  show,
  hide,
});

const loading = ref(false);
const visible = ref(false);
const emit = defineEmits(["update"]);

const cohort = ref(null);

function hide() {
  visible.value = false;
  cohort.value = null;
  loading.value = false;
}

function show(_cohort) {
  cohort.value = _cohort;
  visible.value = true;
}

const transitionMessages = {
  "PRIVATE->UNLISTED": {
    message:
      "This cohort will become accessible to anyone with the link, but it will not appear in search results. Please note: the cohort will be locked and further edits will not be possible.",
  },
  "UNLISTED->PRIVATE": {
    message:
      "Only you will be able to access and edit this cohort. It will no longer be available to others, even with a direct link.",
  },
  "UNLISTED->PUBLIC": {
    message:
      "This cohort will be visible to all users and included in search results. Please note: the cohort will remain locked and cannot be edited.",
  },
  "PUBLIC->UNLISTED": {
    message:
      "This cohort will be removed from search results and only accessible via a direct link. The cohort will remain locked and cannot be edited.",
  },
};

const selectedVisibility = ref(null);
const transitionKey = computed(() => {
  if (cohort.value && selectedVisibility.value) {
    return `${cohort.value.visibility}->${selectedVisibility.value}`;
  }
  return null;
});

function onChange() {
  loading.value = true;
  cohortService
    .updateVisibility(cohort.value.id, selectedVisibility.value)
    .then(() => {
      toast.success("Cohort visibility changed successfully.");
      emit("update");
      hide();
    })
    .catch((error) => {
      toast.error(`Failed to change cohort visibility: ${error.message}`);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
