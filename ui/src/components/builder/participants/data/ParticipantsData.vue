<template>
  <div class="space-y-1">
    <collapsible
      v-for="participant in props.participants"
      :key="participant.id"
      v-model="participant.collapse_model"
    >
      <template #header-content>
        <div>participant: {{ participant.ib_id }}</div>
      </template>

      <ParticipantDetails :participant_id="participant.id" />
    </collapsible>
  </div>
</template>

<script setup>
const props = defineProps({
  participants: {
    type: Array,
    required: true,
  },
});
</script>
