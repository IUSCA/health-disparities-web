<template>
  <p class="text-gray-500">
    Browse and search through the data in the database.
  </p>

  <div class="mt-3">
    <h2 class="text-xl font-bold">EHR Domains</h2>

    <!-- search bar -->
    <div class="flex gap-3 mt-3 max-w-5xl">
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

    <div class="flex flex-wrap gap-3 lg:gap-5 mt-3">
      <VaCard
        v-for="card in cards"
        :key="card.category"
        :to="`/data_browser/${card.category}`"
        class="w-full mx-3 md:w-auto md:mx-0"
      >
        <VaCardTitle>
          <span class="text-lg"> {{ card.title }} </span>
        </VaCardTitle>
        <VaCardContent>
          <PhenotypeDataCount
            :category="card.category"
            :title="card.title"
            :keyword="debouncedKeyword"
            :icon="card.icon"
          />
        </VaCardContent>
      </VaCard>
    </div>
  </div>

  <div class="mt-5">
    <h2 class="text-xl font-bold">Genomics</h2>

    <div class="flex flex-wrap gap-3 lg:gap-5 mt-3">
      <VaCard to="/variantXplorer" class="w-full mx-3 md:w-auto md:mx-0">
        <VaCardTitle>
          <span class="text-lg"> Variants </span>
        </VaCardTitle>
        <VaCardContent>
          <GenomicsDataCount />
        </VaCardContent>
      </VaCard>

      <VaCard
        v-for="card in annotation_cards"
        :key="card.source"
        to="/variantXplorer"
        class="w-full mx-3 md:w-auto md:mx-0"
      >
        <VaCardTitle>
          <span class="text-lg"> {{ card.title }} </span>
        </VaCardTitle>
        <VaCardContent>
          <AnnotationDataCount
            :source="card.source"
            :title="card.title"
            :icon="card.icon"
            :units="card.units"
          />
        </VaCardContent>
      </VaCard>
    </div>
  </div>
</template>

<script setup>
// const props = defineProps({});
const filterInput = ref("");
const debouncedKeyword = refDebounced(filterInput, 300);
const cards = [
  {
    title: "Labs",
    category: "lab",
    icon: "mdi-test-tube",
  },
  {
    title: "Diagnoses",
    category: "dx",
    icon: "mdi-stethoscope",
  },
  {
    title: "Medications",
    category: "medication",
    icon: "mdi-pill",
  },
  {
    title: "Hospitalizations",
    category: "hospital",
    icon: "mdi-hospital-box",
  },
];

const annotation_cards = [
  {
    title: "Genes",
    icon: "mdi-microscope",
    source: "genes",
    units: "genes",
  },
  {
    title: "gnomAD",
    icon: "mdi-chart-histogram",
    source: "gnomad",
    units: "annotations",
  },
  {
    title: "ClinVar",
    icon: "mdi-alpha-c-circle-outline",
    source: "clinvar",
    units: "annotations",
  },
];
</script>

<route lang="yaml">
meta:
  title: Data Browser
  nav: [{ label: "Data Browser" }]
</route>
