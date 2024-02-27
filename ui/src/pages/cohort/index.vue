<template>
  <!-- Cohort Selector -->
  <div class="mb-5">
    <CohortSelector />
  </div>

  <!-- Query Builder -->
  <VaCard class="cohort-card">
    <VaCardContent>
      <div class="flex flex-col md:flex-row gap-3">
        <div class="md:w-3/12 md:border-r md:border-solid md:border-gray-500">
          <CohortInfo
            name="Untitled Cohort"
            :total-count="60000"
            :count="1734"
          />
        </div>

        <div class="md:w-9/12">
          <CohortQueryBuilder />
        </div>
      </div>
    </VaCardContent>
  </VaCard>
</template>

<script setup>
const props = defineProps({});
</script>

<route lang="yaml">
meta:
  title: Cohort Builder
  nav: [{ label: "Cohort Builder" }]
</route>

<style scoped lang="scss">
.cohort-card {
  --va-card-padding: 0.75rem;
}
</style>
