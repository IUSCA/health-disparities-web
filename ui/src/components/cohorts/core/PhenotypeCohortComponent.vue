<template>
  <PhenotypeQueryBuilder v-model="cohort.query.filters" />
</template>

<script setup>
import { PhenotypeCohort } from "@/components/cohorts/models";

const cohort = defineModel("cohort", {
  type: PhenotypeCohort,
  required: true,
});
</script>
