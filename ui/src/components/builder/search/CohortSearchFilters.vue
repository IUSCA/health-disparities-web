<template>
  <VaForm class="flex flex-wrap items-center md:justify-end gap-3">
    <!-- authorship - Mine / Others -->
    <!-- color="background-element"
          border-color="background-element" -->
    <VaButtonToggle
      v-model="params.is_mine"
      :options="authorshipOptions"
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
    <!-- <VaSelect
      v-model="params.type"
      :options="cohortTypeOptions"
      placeholder="Cohort Type"
      class="w-40"
      text-by="label"
      value-by="value"
      clearable
    /> -->

    <!-- is published drop down: true, false -->
    <VaSelect
      v-model="params.is_published"
      :options="isPublishedOptions"
      class="w-44 flex-none"
      text-by="label"
      value-by="value"
      :disabled="!params.is_mine"
      clearable
      placeholder="Published Status"
    />

    <!-- is_locked drop down -->
    <VaSelect
      v-model="params.is_locked"
      :options="isLockedOptions"
      class="w-40 flex-none"
      text-by="label"
      value-by="value"
      :disabled="!params.is_mine || params.is_published === true"
      clearable
      placeholder="Locked Status"
    />

    <!-- is_protected drop down -->
    <!-- <VaSelect
      v-model="params.isProtected"
      :options="isProtectedOptions"
      label="Is Protected"
      class=""
      :disabled="!params.is_mine"
    /> -->

    <!-- reset button -->
    <VaButton @click="emit('reset')" icon="refresh"> Reset </VaButton>
  </VaForm>
</template>

<script setup>
import config from "@/config";

const params = defineModel("params");
// const props = defineProps({})
const emit = defineEmits(["reset"]);

const isPublishedOptions = [
  { label: "Published", value: true },
  { label: "Unpublished", value: false },
];

const isLockedOptions = [
  { label: "Locked", value: true },
  { label: "Unlocked", value: false },
];

// const isProtectedOptions = [
//   { label: "All", value: "" },
//   { label: "Protected", value: true },
//   { label: "Unprotected", value: false },
// ];

const authorshipOptions = [
  { label: "Mine", value: true },
  { label: "Others", value: false },
];

// const SCHEMA = config.cohort.schema;
// const cohortTypeOptions = [
//   { label: "Phenotype", value: SCHEMA.phenotype.name },
//   { label: "Genotype", value: SCHEMA.genotype.name },
//   { label: "Combination", value: SCHEMA.combination.name },
// ];

// when is_mine is false, set is_published and is_locked to null
watch(
  () => params.value.is_mine,
  (val) => {
    if (!val) {
      params.value.is_published = null;
      params.value.is_locked = null;
      // params.value.isProtected = null;
    }
  },
);

// when is_published is true, set is_locked to null
watch(
  () => params.value.is_published,
  (val) => {
    if (val === true) {
      params.value.is_locked = null;
    }
  },
);

const debouncedUpdate = useDebounceFn((val) => {
  params.value.search_term = val;
}, config.debounce_ms);
</script>
