<template>
  <div
    :class="{
      'pl-2 border-l-4 border-red-500 border-solid border-': error,
    }"
  >
    <!-- Choose a minimum of one option to display the count of participants possessing these zygosities within the filtered variants. -->
    <!-- Select at least one option to see the participant count for the selected zygosities in the filtered variants. A participant is counted if they have at least one filtered variant with the chosen zygosity. -->
    <p class="pb-2">
      Select a minimum of one option to count participants with at least one
      filtered variant of the chosen zygosities.
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-semibold pr-2">Zygosities: </span>

      <VaCheckbox
        v-for="zyg in ZYGOSITIES"
        :key="zyg.key"
        v-model="selection"
        :array-value="zyg.key"
        :label="zyg.label"
      />

      <div v-if="error" class="text-red-500 pl-2">
        Please select at least one option.
      </div>
    </div>
  </div>
</template>

<script setup>
const selection = defineModel({
  type: Array,
  required: true,
});

//"HOM", "HET", "HETFLP", "HOMALT"
const ZYGOSITIES = [
  {
    key: "MISSING",
    label: "Missing",
  },
  {
    key: "HOM",
    label: "Hom. Ref.",
  },
  {
    key: "HET",
    label: "Het.",
  },
  {
    key: "HETFLP",
    label: "Het. Flipped",
  },
  {
    key: "HOMALT",
    label: "Hom. Alt.",
  },
];

const error = computed(() => {
  return !selection.value.length;
});
</script>
