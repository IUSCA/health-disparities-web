<template>
  <div class="text-center space-y-6 mt-10">
    <h1 class="text-3xl font-bold va-text-success">
      Thank you for your submission!
    </h1>
    <p class="va-text-secondary text-lg">
      Your response has been recorded successfully.
    </p>
    <a
      href="/"
      class="inline-block px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
    >
      Return to Homepage
    </a>
  </div>
</template>

<script setup>
import requestService from "@/services/cohort_access_requests";
const route = useRoute();

onMounted(() => {
  const requestID = route.query.request_id;
  console.log(requestID);
  if (requestID) {
    requestService
      .sync(requestID)
      .then((response) => {
        console.log("Survey completed successfully", response);
      })
      .catch((error) => {
        console.error("Error completing survey", error);
      });
  }
});
</script>
