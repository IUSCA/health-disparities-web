<template>
  <div
    class="analysis-summary border border-solid border-gray-200 dark:border-gray-600 px-4 rounded-lg shadow"
    v-if="props.summary"
  >
    <table class="va-table va-table--hoverable">
      <thead>
        <tr>
          <th>Race/Ethnicity</th>
          <th>Num. Total</th>
          <th>Num. Positive</th>
          <th>% Positive</th>
          <th>Adjusted %</th>
        </tr>
      </thead>
      <tbody class="text-sm">
        <!-- Black -->
        <tr>
          <td class="font-semibold">Black</td>
          <td>{{ props.summary.num_total.Black }}</td>
          <td>{{ props.summary.num_positive.Black }}</td>
          <td>{{ props.summary.percent_positive.Black.toFixed(1) }}%</td>
          <td>{{ props.summary.adj_percents.Black.toFixed(1) }}%</td>
        </tr>

        <!-- Hispanic -->
        <tr>
          <td class="font-semibold">Hispanic</td>
          <td>{{ props.summary.num_total.Hispanic }}</td>
          <td>{{ props.summary.num_positive.Hispanic }}</td>
          <td>{{ props.summary.percent_positive.Hispanic.toFixed(1) }}%</td>
          <td>{{ props.summary.adj_percents.Hispanic.toFixed(1) }}%</td>
        </tr>

        <!-- White -->
        <tr>
          <td class="font-semibold">White</td>
          <td>{{ props.summary.num_total.White }}</td>
          <td>{{ props.summary.num_positive.White }}</td>
          <td>{{ props.summary.percent_positive.White.toFixed(1) }}%</td>
          <td>{{ props.summary.adj_percents.White.toFixed(1) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  summary: {
    type: Object,
    required: true,
  },
});
</script>

<style scoped>
.analysis-summary {
  overflow-x: auto;
}

.analysis-summary .va-table th {
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
