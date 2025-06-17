<template>
  <div
    class="cohort-summary border border-solid border-gray-200 dark:border-gray-600 px-4 rounded-lg shadow"
  >
    <table class="va-table va-table--hoverable">
      <thead>
        <tr>
          <th>Race/Ethnicity</th>
          <th>Total Count</th>
          <th>Mean Age</th>
          <th>Female %</th>
          <th>Mean Encounters</th>
        </tr>
      </thead>
      <tbody class="text-sm">
        <tr v-for="item in props.summary" :key="item.race_ethnicity">
          <td>{{ item.race_ethnicity }}</td>
          <td>{{ item.total_count.toLocaleString() }}</td>
          <td>{{ item.mean_age.toFixed(1) }}</td>
          <td>{{ (item.female_percentage * 100).toFixed(1) }}%</td>
          <td>{{ item.mean_encounters.toFixed(1) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  summary: {
    type: Array,
    required: true,
  },
});

// props.summary
// const summary = [
//   {
//     race_ethnicity: "Black",
//     total_count: 15448,
//     mean_age: 58.72786121180735,
//     female_percentage: 1.0,
//     mean_encounters: 16.346258415328844,
//   },
//   {
//     race_ethnicity: "Hispanic",
//     total_count: 1668,
//     mean_age: 55.30875299760192,
//     female_percentage: 1.0,
//     mean_encounters: 13.051558752997602,
//   },
//   {
//     race_ethnicity: "Other",
//     total_count: 2620,
//     mean_age: 59.59389312977099,
//     female_percentage: 1.0,
//     mean_encounters: 9.861832061068702,
//   },
//   {
//     race_ethnicity: "White",
//     total_count: 52418,
//     mean_age: 65.0164447327254,
//     female_percentage: 1.0,
//     mean_encounters: 15.621732992483498,
//   },
// ];
</script>

<style scoped>
.cohort-summary {
  overflow-x: auto;
}

.cohort-summary .va-table th {
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
