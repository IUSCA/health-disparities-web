<template>
  <VaForm class="flex flex-wrap items-center md:justify-end gap-3">
    <!-- authorship -->
    <!-- color="background-element"
          border-color="background-element" -->
    <VaButtonToggle
      v-model="params.view_mode"
      :options="viewModeOptions"
      color="background-element"
      border-color="background-border"
      toggleColor="primary"
    />

    <VaInput
      :model-value="params.search_term"
      @update:model-value="debouncedUpdate"
      placeholder="Search for a cohort by its name or description"
      class="flex-auto"
      clearable
    />

    <!-- cohort type drop down -->
    <VaSelect
      v-model="params.type"
      :options="cohortTypeOptions"
      placeholder="Cohort Type"
      class="w-40"
      text-by="label"
      value-by="value"
      clearable
    />

    <!-- Archived select -->
    <VaSelect
      v-model="params.status"
      :options="[
        { label: 'All', value: 'all' },
        { label: 'Archived', value: 'archived' },
        { label: 'Favorited', value: 'favorited' },
      ]"
      placeholder="Archived"
      class="w-40"
      text-by="label"
      value-by="value"
    />

    <!-- reset button -->
    <VaButton @click="emit('reset')" icon="refresh"> Reset </VaButton>
  </VaForm>
</template>

<script setup>
import config from "@/config";

const params = defineModel("params");
// const props = defineProps({})
const emit = defineEmits(["reset"]);

const viewModeOptions = [
  { label: "Created by me", value: "created_by_me" },
  { label: "Published", value: "published" },
];

const SCHEMA = config.cohort.schema;
const cohortTypeOptions = [
  { label: "Phenotype", value: SCHEMA.phenotype.name },
  { label: "Genotype", value: SCHEMA.genotype.name },
  { label: "Combination", value: SCHEMA.combination.name },
];

const debouncedUpdate = useDebounceFn((val) => {
  params.value.search_term = val;
}, config.debounce_ms);
</script>
