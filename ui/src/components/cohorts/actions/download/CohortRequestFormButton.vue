<template>
  <VaButton
    @click="onFormClick"
    preset="primary"
    :loading="loading"
    :disabled="loading"
  >
    <div class="flex items-center gap-1">
      <span> Request Access </span>
      <i-mdi-open-in-new />
    </div>
  </VaButton>
</template>

<script setup>
import requestService from "@/services/cohort_access_requests";
import { buildREDCapSurveyUrl } from "@/services/redcap";
import toast from "@/services/toast";

const props = defineProps({
  cohort: {
    type: Object,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
  createRequest: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["done"]);

const loading = ref(false);

function onFormClick() {
  loading.value = true;
  const promise = props.createRequest
    ? requestService.createForSelf(props.cohort.id)
    : Promise.resolve();

  promise
    .then(() => {
      window.open(
        buildREDCapSurveyUrl({ user: props.user, cohort: props.cohort }),
        "_blank",
      );
      emit("done");
    })
    .catch((err) => {
      toast.error("Failed to create cohort access request.");
      console.error("Failed to create cohort access request.", err);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
