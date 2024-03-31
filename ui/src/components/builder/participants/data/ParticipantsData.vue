<template>
  <div class="space-y-1">
    <collapsible
      v-for="participant in props.participants"
      :key="participant.id"
      v-model="participant.collapse_model"
    >
      <template #header-content>
        <div class="flex flex-wrap gap-3 items-center">
          <div class="w-1/5">Participant ID: {{ participant.id }}</div>

          <div
            class="flex flex-wrap gap-3 items-center text-sm va-text-secondary"
          >
            <div>Gender: {{ participant.demographics.gender }}</div>
            <div>|</div>
            <div>
              Age: {{ datetime.fromNow(participant.demographics.dob, true) }}
            </div>
            <div>|</div>
            <div>Race: {{ participant.demographics.race }}</div>
          </div>
        </div>
      </template>

      <ParticipantDetails :participant_id="participant.id" />
    </collapsible>
  </div>
</template>

<script setup>
import * as datetime from "@/services/datetime";
const props = defineProps({
  participants: {
    type: Array,
    required: true,
  },
});
</script>
