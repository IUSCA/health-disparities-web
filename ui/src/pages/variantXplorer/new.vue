<template>
  <div class="flex flex-col gap-3">
    <VaCard>
      <VaCardContent>
        <SourceSelect v-model="source" />
        <SnapshotSelect v-model="snapshot" />
        <VariantSearchInput
          v-model="query"
          :example_searches="example_searches"
          @clear="reset"
        />
      </VaCardContent>
    </VaCard>

    <VaButton @click="() => columnOrderingModal.show()"> Columns </VaButton>

    <!-- TODO: when is query updated and in which case the loader is shown -->
    <!-- no query is selected -->
    <div class="flex flex-col justify-center items-center mt-24" v-if="!query">
      <!-- loading spinner -->
      <div v-if="loading" class="flex justify-center items-center mt-24">
        <semipolar-spinner
          :animation-duration="2000"
          :size="65"
          :color="colors.primary"
        />
      </div>
      <VariantSearchExample
        v-else
        :example_searches="example_searches"
        @search="(val) => (query = val)"
      />
    </div>

    <!-- query selected and results are ready -->
  </div>

  <ColumnOrderingSelectionModal ref="columnOrderingModal" />
</template>

<script setup>
// import { useVariantsStore } from "@/stores/variants";
import { SemipolarSpinner } from "epic-spinners";
// import { storeToRefs } from "pinia";

// const props = defineProps({})

// const variantsStore = useVariantsStore();
// const { columns, columnsSelected } = storeToRefs(variantsStore);

const snapshot = ref(null);
const source = ref(null);
const query = ref(null);
const loading = ref(false);
const columnOrderingModal = ref(null);

const example_searches = {
  gene: "GAB4",
  variant: "22-17311348-C-A",
  genomic_region: "chr22:17455700-17575000",
};

function reset() {
  console.log("reset");
}
</script>

<route lang="yaml">
meta:
  title: Variant Xplorer
  nav: [{ label: "Variant Xplorer" }]
</route>
