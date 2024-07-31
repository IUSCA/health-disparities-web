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
      :total_results="total_count"
      :curr_items="participants.length"
      :page_size_options="PAGE_SIZE_OPTIONS"
    />
  </div>
</template>

<script setup>
import * as datetime from "@/services/datetime";
import participantsService from "@/services/participants";

const props = defineProps({
  cohortId: {
    type: String,
    required: true,
  },
  lastUpdated: {
    type: Number,
  },
});

const participants = ref([]);
const currPage = ref(1);
const pageSize = ref(10);
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const offset = computed(() => (currPage.value - 1) * pageSize.value);
const total_count = ref(0);

function fetchParticipants() {
  return participantsService
    .getByCohortId({
      cohort_id: props.cohortId,
      limit: pageSize.value,
      offset: offset.value,
    })
    .then((response) => {
      participants.value = response.data.participants;
      total_count.value = response.data.metadata.total_count;
    });
}
// throttled fn runs at most once every 100ms
// it'll run on first call without delay and then ignores calls for 100ms
const throttledFecth = useThrottleFn(fetchParticipants, 100);

watch(
  [() => props.cohortId, () => props.lastUpdated, pageSize],
  () => {
    currPage.value = 1;
    throttledFecth();
  },
  {
    immediate: true,
  },
);

watch(currPage, throttledFecth);
</script>
