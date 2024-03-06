<template>
  <div
    class="py-4 md:py-8 px-4 md:px-8 flex flex-col items-center justify-center"
  >
    <div
      class="illustration-bg w-full max-w-xl h-48 md:h-64 mb-8 bg-no-repeat bg-center bg-contain"
    ></div>

    <h2 class="text-3xl font-bold text-center mb-4">
      Welcome to Cohort Builder!
    </h2>
    <p class="text-lg text-center mb-6">
      Streamline your cohort creation process with ease.
    </p>

    <AddCohortButton />
  </div>
</template>

<script setup></script>

<style scoped>
/* image is from 
https://freeillustrations.xyz/illustration/technology-illustrations/ and 
https://www.reshot.com/free-vector-illustrations/item/robot-scientist-N8RWCS437D/ 
*/
.illustration-bg {
  background-image: url("/illustration.svg");
}
</style>
