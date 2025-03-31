<template>
  <PhenotypeSelect
    value-by="id"
    track-by="id"
    :fetch-options-fn="fetchOptions"
  />
</template>

<script setup>
import sourceSerice from "@/services/sources";

function fetchOptions() {
  return sourceSerice.getAll().then((res) => {
    return res.data.filter((s) => s.id !== 2);
  });
}
</script>
