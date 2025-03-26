<template>
  <div>
    <div class="flex justify-start items-center mb-1">
      <div class="w-9/12">
        <div
          class="w-full text-lg leading-5 whitespace-nowrap overflow-clip overflow-ellipsis"
          :title="props.cohort.getDisplayName()"
        >
          {{ props.cohort.getDisplayName() }}
        </div>
      </div>

      <div class="flex ml-auto w-3/12 items-center">
        <!-- edit icon -->
        <div
          title="Edit"
          @click="emit('edit')"
          @keydown.enter="emit('edit')"
          role="button"
          tabindex="0"
        >
          <i-mdi-pencil
            class="va-text-secondary text-sm"
            v-if="!props.cohort.isSavingDisabled()"
            style="color: var(--va-primary)"
          />
        </div>

        <!-- published / unpublished -->
        <CohortPublishedIcon :is_published="props.cohort.is_published" />

        <!-- locked / unlocked -->
        <CohortLockedIcon :is_locked="props.cohort.is_locked" />
      </div>
    </div>

    <!-- participant count -->
    <div class="va-text-secondary">
      <span class="font-semibold">
        <NumberTransition :target="props.cohort.size" :debounce="50" />
      </span>
      <span v-if="props.totalCount">
        of {{ number_formatter.format(props.totalCount) }}
      </span>
      <span> participants </span>
    </div>

    <!-- show ID when published -->
    <div
      class="va-text-secondary text-sm mt-1 flex items-center gap-1"
      v-if="props.cohort.is_published && props.cohort.id"
      :title="props.cohort.id"
    >
      <span>{{ props.cohort.id }}</span>
      <CopyButton :text="props.cohort.id" preset="plain" size="small" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  cohort: Object,
  totalCount: Number,
});

const emit = defineEmits(["edit"]);

const number_formatter = Intl.NumberFormat("en");
</script>
