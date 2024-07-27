<template>
  <div
    class="py-4 md:py-8 px-4 md:px-8 flex flex-col items-center justify-center opacity-65 hover:opacity-100 transition-opacity duration-300"
  >
    <div
      class="illustration-bg w-full max-w-xl h-24 md:h-36 mb-8 bg-no-repeat bg-center bg-contain"
    ></div>

    <h2 class="text-xl font-semibold text-center">
      {{ props.isVisualization ? "Visualizations" : "Participant Data" }}
    </h2>
    <p class="text-center">
      <span v-if="props.isVisualization">
        Please select a cohort from the dropdown to see visualizations.
      </span>
      <span v-else>
        Please select a cohort from the dropdown to see its participant data.
      </span>
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  isVisualization: {
    type: Boolean,
    default: true,
  },
});
</script>

<style scoped>
/* image is from
 * https://www.reshot.com/free-vector-illustrations/item/data-analysis-ZHJ7NS628L/
 * converted from eps to svg using https://cloudconvert.com/eps-to-svg
*/

.illustration-bg {
  background-image: url("/cohort-data-no-selection.svg");
}
</style>
