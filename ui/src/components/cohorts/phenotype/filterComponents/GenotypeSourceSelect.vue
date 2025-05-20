<template>
  <PhenotypeSelect
    value-by="id"
    track-by="id"
    :fetch-options-fn="fetchOptions"
  />
</template>

<script setup>
import sourceService from "@/services/sources";

function fetchOptions() {
  return sourceService.getAll().then((res) => {
    return res.data.filter((s) => s.id !== 2);
  });
}
</script>
