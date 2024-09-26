<template>
  <va-modal
    v-model="visible"
    :title="cohort?.name ? `Delete - ${cohort.name}` : 'Delete Cohort'"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    size="large"
  >
    <VaInnerLoading :loading="loading">
      <!--   -->
      <div v-if="isDeletable == null || isDeletable">
        <p>
          Are you sure you want to delete
          <strong>{{ cohort.name }}</strong
          >?
        </p>
        <p class="mt-2">This action cannot be undone.</p>
      </div>

      <!-- dependent cohorts -->
      <div v-else>
        <div class="mb-4" :class="{ 'font-semibold': !deleteDependents }">
          <span>
            {{ reasonTexts[reason] || reasonTexts.DEFAULT }}
          </span>
        </div>
        <div v-if="reason === 'COHORT_IS_A_DEPENDENCY'">
          <ul class="list-disc list-inside">
            <li
              v-for="c in dependentCohorts"
              :key="c.id"
              class="ml-4 font-medium"
            >
              <span> {{ c.name }} {{ c.size }} </span>
            </li>
          </ul>

          <VaCheckbox
            v-model="deleteDependents"
            label="Delete all dependent cohorts as well"
            class="mt-4"
          />

          <div class="my-4" :class="{ invisible: !deleteDependents }">
            <p class="font-semibold tracking-wide">
              Are you sure you want to delete
              {{ maybePluralize(1 + dependentCohorts.length, "cohort") }}? This
              action cannot be undone.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <va-button @click="hide" :disabled="loading" preset="primary"
          >Cancel</va-button
        >
        <va-button
          color="danger"
          @click="onDelete(cohort)"
          :disabled="loading || !(isDeletable || deleteDependents)"
        >
          {{
            dependentCohorts.length > 0
              ? `Delete ${1 + dependentCohorts.length} Cohorts`
              : "Delete"
          }}
        </va-button>
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import cohortService from "@/services/cohorts";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";

// const props = defineProps({})
// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const emit = defineEmits(["update"]);

const visible = ref(false);
const loading = ref(false);
const cohort = ref(null);
const isDeletable = ref(null);
const reason = ref(null);
const dependentCohorts = ref([]);
const deleteDependents = ref(false);

const reasonTexts = {
  COHORT_IS_PUBLISHED: "This cohort cannot be deleted because it is published.",
  COHORT_IS_A_DEPENDENCY:
    "This cohort cannot be deleted because it is directly or indirectly used in the following cohorts:",
  DEFAULT: "This cohort cannot be deleted.",
};

function hide() {
  visible.value = false;
  cohort.value = null;
  isDeletable.value = null;
  reason.value = null;
  dependentCohorts.value = [];
  deleteDependents.value = false;
}

function show(_cohort) {
  cohort.value = _cohort;
  visible.value = true;
}

watch(cohort, () => {
  if (!cohort.value) return;
  loading.value = true;
  cohortService
    .isDeletable(cohort.value.id)
    .then((res) => {
      isDeletable.value = res.data.is_deletable;
      reason.value = res.data.reason;
      dependentCohorts.value = res.data?.dependent_cohorts || [];
    })
    .catch((err) => {
      console.error(err);
      toast.error("Unable to fetch cohort details");
    })
    .finally(() => {
      loading.value = false;
    });
});

function onDelete(row) {
  loading.value = true;
  return cohortService
    .delete({ id: row.id, delete_dependents: deleteDependents.value })
    .then((res) => {
      const count = res.data.count;
      toast.success(`${maybePluralize(count, "cohort")} deleted successfully`);
      emit("update");
      hide();
    })
    .catch((err) => {
      err?.response?.data?.message
        ? toast.error("Unable to delete cohort : " + err.response.data.message)
        : toast.error("Unable to delete cohort");
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
