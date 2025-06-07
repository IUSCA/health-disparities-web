<template>
  <div
    class="py-4 md:py-8 px-4 md:px-8 flex flex-col items-center justify-center"
  >
    <div
      class="illustration-bg w-full max-w-xl h-24 md:h-36 mb-8 bg-no-repeat bg-center bg-contain"
    ></div>

    <h2 class="text-xl font-semibold text-center mb-2">
      Not enough participants to show data.
    </h2>
    <p class="text text-center">
      Please select another cohort or update its query to include more
      participants.
    </p>
  </div>
</template>

<script setup></script>

<style scoped>
/* image is from
 * https://www.reshot.com/free-vector-illustrations/item/nature-research-6KB8J35LAN/
 * converted from eps to svg using https://cloudconvert.com/eps-to-svg
*/

.illustration-bg {
  background-image: url("/cohort-data-no-visualization.svg");
}
</style>
