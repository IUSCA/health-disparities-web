<template>
  <div
    class="text-sm border border-solid border-gray-200 dark:border-gray-600 px-4 pt-2 rounded-lg shadow h-full"
  >
    <p class="text-base font-semibold mb-2">Query</p>
    <div class="lg:grid lg:grid-cols-12 lg:gap-4">
      <!-- Demographics Section - Left Pane -->
      <div
        class="lg:col-span-4 lg:border-r lg:border-gray-200 lg:dark:border-gray-600"
      >
        <div v-if="query.demographic" class="mb-4 lg:mb-0">
          <div class="">
            <!-- Age Range -->
            <div v-if="query.demographic.age" class="mt-1">
              <span class="pr-1">Age Range:</span>
              <span v-if="query.demographic.age.min">
                Min: {{ query.demographic.age.min }}
              </span>
              <span v-if="query.demographic.age.max" class="pl-2">
                Max: {{ query.demographic.age.max }}
              </span>
            </div>
            <!-- Gender -->
            <div v-if="query.demographic.gender" class="mt-1">
              <span class="pr-1"> Gender: </span>
              {{ query.demographic.gender }}
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnosis and Procedures Section - Right Pane -->
      <div class="lg:col-span-8 lg:pl-">
        <!-- Diagnosis Section -->
        <div v-if="query.dx?.code?.length" class="mb-4">
          <VaButton
            size="small"
            class="mt-2 underline"
            preset="plain"
            @click="dxModal = true"
          >
            <h4 class="">Diagnoses ({{ query.dx.code.length }})</h4>
          </VaButton>
        </div>

        <!-- Procedures Section -->
        <div v-if="query.procedure?.code?.length" class="mb-4">
          <VaButton
            size="small"
            class="mt-2 underline"
            preset="plain"
            @click="procedureModal = true"
          >
            <h4 class="">Procedures ({{ query.procedure.code.length }})</h4>
          </VaButton>
        </div>
      </div>
    </div>
  </div>

  <VaModal
    v-model="dxModal"
    hide-default-actions
    close-button
    title="Diagnoses"
    fixed
  >
    <div class="h-full overflow-y-auto">
      <div
        v-for="item in query.dx.code"
        :key="item.id"
        class="p-1 flex items-center justify-between"
      >
        <span> {{ item }} </span>
      </div>
    </div>
  </VaModal>

  <VaModal
    v-model="procedureModal"
    hide-default-actions
    close-button
    title="Procedures"
  >
    <div class="h-full overflow-y-auto">
      <div
        v-for="item in query.procedure.code"
        :key="item.id"
        class="p-1 flex items-center justify-between"
      >
        <span> {{ item }} </span>
      </div>
    </div>
  </VaModal>
</template>

<script setup>
defineProps({
  query: {
    type: Object,
    required: true,
  },
});
const dxModal = ref(false);
const procedureModal = ref(false);
</script>

<style scoped></style>
