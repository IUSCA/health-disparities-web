<template>
  <!-- <VaInnerLoading :loading="loading"></VaInnerLoading> -->
  <div class="h-full flex items-center mt-3">
    <div class="flex flex-wrap items-center gap-y-3">
      <CohortsWithOperators
        :cohorts="combined_cohorts"
        :logicalOperators="cohort.query.operators"
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
    <!-- </VaInnerLoading> -->
  </div>
</template>

<script setup>
import { CombinationCohort, createCohort } from "@/components/cohorts/models";
import cohortService from "@/services/cohorts";
import { useModal } from "vuestic-ui";

const cohort = defineModel("cohort", {
  type: CombinationCohort,
});

const { confirm } = useModal();

const combined_cohorts = ref([]);
const loading = ref(true);

onMounted(() => {
  // load operands (cohorts) from the criteria
  const promises = (cohort.value?.query?.cohort_ids || []).map((id) => {
    return cohortService.getById(id).then((res) => {
      return createCohort(res.data);
    });
  });
  Promise.all(promises)
    .then((res) => {
      combined_cohorts.value = res;
    })
    .finally(() => {
      loading.value = false;
    });
});

function handleEdit() {
  confirm({
    message: "Opens in a new tab. Do you want to continue?",
    okText: "Edit in a new tab",
  }).then((ok) => {
    ok && window.open(`/cohorts?edit=true&id=${cohort.value.id}`, "_blank");
  });
}
</script>
