<template>
  <div
    class="analysis-results border border-solid border-gray-200 dark:border-gray-600 px-4 rounded-lg shadow"
    v-if="props.results"
  >
    <table class="va-table va-table--hoverable">
      <thead>
        <tr>
          <th>Variable</th>
          <th>Coefficient</th>
          <th>P-value</th>
        </tr>
      </thead>
      <tbody class="text-sm">
        <tr>
          <td class="font-semibold">Age</td>
          <td>{{ props.results.params.age.toFixed(3) }}</td>
          <td>{{ props.results["p-values"].age.toFixed(3) }}</td>
        </tr>

        <!-- Gender -->
        <tr>
          <td class="font-semibold">Gender</td>
          <td>{{ props.results.params.gender.toFixed(3) }}</td>
          <td>{{ props.results["p-values"].gender.toFixed(3) }}</td>
        </tr>

        <!-- Num Encounters -->
        <tr>
          <td class="font-semibold">Num Encounters</td>
          <td>{{ props.results.params.num_encounters.toFixed(3) }}</td>
          <td>{{ props.results["p-values"].num_encounters.toFixed(3) }}</td>
        </tr>

        <!-- Black -->
        <tr>
          <td class="font-semibold">Black</td>
          <td>{{ props.results.params.Black.toFixed(3) }}</td>
          <td>{{ props.results["p-values"].Black.toFixed(3) }}</td>
        </tr>

        <!-- Hispanic -->
        <tr>
          <td class="font-semibold">Hispanic</td>
          <td>{{ props.results.params.Hispanic.toFixed(3) }}</td>
          <td>{{ props.results["p-values"].Hispanic.toFixed(3) }}</td>
        </tr>

        <!-- Intercept -->
        <tr>
          <td class="font-semibold">Intercept</td>
          <td>{{ props.results.params.intercept.toFixed(3) }}</td>
          <td>{{ props.results["p-values"].intercept.toFixed(3) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  results: {
    type: Object,
    required: true,
  },
});
</script>

<style scoped>
.analysis-results {
  overflow-x: auto;
}

.analysis-results .va-table th {
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
