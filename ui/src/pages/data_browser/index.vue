<template>
  <h1 class="text-2xl font-bold">Data Browser</h1>
  <p class="text-sm text-gray-500">
    Browse and search through the data in the database.
  </p>

  <!-- search bar -->
  <div class="flex gap-3">
    <div class="flex-1">
      <va-input
        v-model="filterInput"
        class="w-full"
        placeholder="Search for data..."
        outline
        clearable
      >
        <template #prependInner>
          <Icon icon="material-symbols:search" class="text-xl" />
        </template>
      </va-input>
    </div>
  </div>

  <div>
    <p>EHR Domains</p>

    <div class="flex flex-wrap gap-3">
      <VaCard>
        <VaCardTitle>
          <span class="text-lg"> Labs </span>
        </VaCardTitle>
        <VaCardContent>
          <PhenotypeDataCount
            category="lab"
            title="Labs"
            :keyword="debouncedKeyword"
            class="w-[200px]"
          />
        </VaCardContent>
      </VaCard>

      <VaCard>
        <VaCardTitle>
          <span class="text-lg"> Diagnoses </span>
        </VaCardTitle>
        <VaCardContent>
          <PhenotypeDataCount
            category="dx"
            title="Diagnoses"
            :keyword="debouncedKeyword"
            class="w-[200px]"
          />
        </VaCardContent>
      </VaCard>

      <VaCard>
        <VaCardTitle>
          <span class="text-lg"> Medications </span>
        </VaCardTitle>
        <VaCardContent>
          <PhenotypeDataCount
            category="medication"
            title="Medications"
            :keyword="debouncedKeyword"
            class="w-[200px]"
          />
        </VaCardContent>
      </VaCard>
    </div>
  </div>

  <div>
    <p>Genomics</p>

    <div class="flex flex-wrap gap-3">
      <VaCard>
        <VaCardTitle>
          <span class="text-lg"> Variants </span>
        </VaCardTitle>
        <VaCardContent>
          <GenomicsDataCount class="w-[200px]" />
        </VaCardContent>
      </VaCard>
    </div>
  </div>
</template>

<script setup>
// const props = defineProps({});
const filterInput = ref("");
const debouncedKeyword = refDebounced(filterInput, 300);
</script>

<route lang="yaml">
meta:
  title: Data Browser
  nav: [{ label: "Data Browser" }]
</route>
