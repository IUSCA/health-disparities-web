<template>
  <div class="h-full flex items-center">
    <div class="flex flex-wrap items-center gap-y-3">
      <CohortsWithOperators
        :cohorts="cohorts"
        :logicalOperators="cohort.criteria.operators"
        readonly
      />
    </div>
    <div class="flex-none ml-auto">
      <va-button
        preset="secondary"
        color="primary"
        borderColor="primary"
        @click="handleEdit"
        icon="edit"
        round
        :disabled="cohort.is_locked"
      />
    </div>
  </div>
</template>

<script setup>
import { CombinationCohort } from "@/components/builder/models";
import { createCohort } from "@/components/builder/models/utils";
import cohortService from "@/services/cohort2";
import { useModal } from "vuestic-ui";

const cohort = defineModel("cohort", {
  type: CombinationCohort,
});
// const emit = defineEmits(["beforeSearch", "afterSearch"]);
const { confirm } = useModal();

const cohorts = ref([]);
onMounted(() => {
  // load operands (cohorts) from the criteria
  const promises = (cohort.value?.criteria?.cohort_ids || []).map((id) => {
    return cohortService.get(id).then((res) => {
      return createCohort(res.data);
    });
  });
  Promise.all(promises).then((res) => {
    cohorts.value = res;
  });
});

function handleEdit() {
  confirm({
    message: "Opens in a new tab. Do you want to continue?",
    okText: "Edit in a new tab",
  }).then((ok) => {
    ok && window.open(`/cohort?edit=true&id=${cohort.value.id}`, "_blank");
  });
  console.log("edit");
}
</script>
