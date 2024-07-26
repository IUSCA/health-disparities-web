<template>
  <div>
    <div class="space-y-1">
      <collapsible
        v-for="participant in participants"
        :key="participant.id"
        v-model="participant.collapse_model"
      >
        <template #header-content>
          <div class="flex flex-wrap gap-3 items-center">
            <div class="w-1/5">Participant ID: {{ participant.id }}</div>

            <div
              class="flex flex-wrap gap-3 items-center text-sm va-text-secondary"
            >
              <div>Gender: {{ participant?.demographics?.gender }}</div>
              <div>|</div>
              <div>
                Age:
                {{ datetime.fromNow(participant?.demographics?.dob, true) }}
              </div>
              <div>|</div>
              <div>Race: {{ participant?.demographics?.race }}</div>
            </div>
          </div>
        </template>

        <ParticipantDetails :participant_id="participant.id" />
      </collapsible>
    </div>
    <Pagination
      class="mt-4 px-1 lg:px-3"
      v-model:page="currPage"
      v-model:page_size="pageSize"
      :total_results="props.cohort.size"
      :curr_items="participants.length"
      :page_size_options="PAGE_SIZE_OPTIONS"
    />
  </div>
</template>

<script setup>
import { Cohort } from "@/components/cohorts/models";
import * as datetime from "@/services/datetime";
import participantsService from "@/services/participants";

const props = defineProps({
  cohort: {
    type: Cohort,
    required: true,
  },
});

const participants = ref([]);
const currPage = ref(1);
const pageSize = ref(10);
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const offset = computed(() => (currPage.value - 1) * pageSize.value);

async function fetchParticipants() {
  console.log(props.cohort.is_dirty, props.cohort.search_id, props.cohort.id);
  if (!props.cohort) return;
  const cohort_id = props.cohort.is_dirty
    ? props.cohort.search_id
    : props.cohort.id;
  console.log("fetchParticipants cohort id", cohort_id);

  if (cohort_id && !props.cohort.isEmpty()) {
    return participantsService
      .getByCohortId({
        cohort_id,
        limit: pageSize.value,
        offset: offset.value,
      })
      .then((response) => {
        participants.value = response.data;
      });
  }
}
// throttled fn runs at most once every 100ms
// it'll run on first call without delay and then ignores calls for 100ms
const throttledFecth = useThrottleFn(fetchParticipants, 100);

watch(
  () => props.cohort,
  () => {
    currPage.value = 1;
    throttledFecth();
  },
  {
    immediate: true,
    deep: true,
  },
);

watch(pageSize, () => {
  currPage.value = 1;
  throttledFecth();
});
watch(currPage, throttledFecth);
</script>
