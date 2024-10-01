<template>
  <div class="md:border-r border-solid border-gray-500 pr-3 mr-3">
    <div class="flex flex-nowrap items-start gap-2">
      <!-- icon -->
      <div>
        <i-mdi-vector-combine
          class="text-4xl"
          :style="{
            color: stringToRGB('combined-cohort'),
          }"
        />
      </div>
      <!-- details -->
      <div>
        <div class="leading-4">
          <span class="font-semibold">
            <NumberTransition :target="combinationCohort.size" :debounce="50" />
          </span>
          <span> participants </span>
        </div>
        <div class="text-sm va-text-secondary w-[128px]">Combined Cohort</div>
      </div>

      <!-- save -->
      <div class="ml-3 h-full mt-auto mb-auto">
        <VaPopover v-if="isSaveDisabled" :message="saveDisabledReason">
          <div>
            <va-button
              color="success"
              icon="save"
              preset="primary"
              size="small"
              disabled
              round
            >
              Save
            </va-button>
          </div>
        </VaPopover>
        <va-button
          v-else
          color="success"
          @click="handleSave"
          icon="save"
          preset="primary"
          size="small"
          border-color="success"
          round
        >
          Save
        </va-button>
      </div>
    </div>
  </div>
  <CohortSaveModal ref="saveModal" :cohort="combinationCohort" />
</template>

<script setup>
// import config from "@/config";
import { stringToRGB } from "@/services/colors";
import toast from "@/services/toast";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();

// const props = defineProps({});

const { cohorts, combinationCohort } = storeToRefs(cohortsStore);
const saveModal = ref(null);

// can only save when
// - cohort is not locked
// - cohort_ids > 1
const isSaveDisabled = computed(() => {
  return combinationCohort.value.is_locked || combinationCohort.value.isEmpty();
});

const saveDisabledReason = computed(() => {
  if (combinationCohort.value.is_locked) {
    return "Combined Cohort is locked";
  }
  if (combinationCohort.value.isEmpty()) {
    return "Combined Cohort is empty";
  }
  return null;
});

function handleSave() {
  // save all underlying cohorts which have unsaved changes
  const unsavedCohorts = cohorts.value.filter((c) => c.hasUnsavedChanges());
  const savePromises = unsavedCohorts.map((c) =>
    c.save({ use_suggested_name_if_new: true }),
  );
  Promise.all(savePromises)
    .then(() => {
      // if the control is here it means no cohort is dirty and all cohorts will have ids
      // however, we need to update cohort_ids in the query with the latest ids
      combinationCohort.value.query.cohort_ids = cohorts.value.map((c) => c.id);
      saveModal.value.show();
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to save underlying cohorts");
    });
}

// todo
// to lock or publish a combined cohort, all underlying cohorts must be locked or published

// todo: better placement of save button
</script>
