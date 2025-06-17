<template>
  <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
      Database Statistics
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Subjects Card -->
      <VaCard class="hover:shadow-lg transition-shadow">
        <VaCardContent>
          <div class="flex items-start justify-between">
            <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <i-mdi-account-group
                class="text-2xl text-blue-600 dark:text-blue-400"
              />
            </div>
            <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.subjects) }}
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Subjects
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Total number of unique patients in the database
            </p>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Diagnoses Card -->
      <VaCard class="hover:shadow-lg transition-shadow">
        <VaCardContent>
          <div class="flex items-start justify-between">
            <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <i-mdi-stethoscope
                class="text-2xl text-green-600 dark:text-green-400"
              />
            </div>
            <div class="flex flex-col items-end">
              <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatNumber(stats.diagnoses) }}
              </div>
              <!-- <div
                class="text-sm va-text-secondary"
                v-if="stats.diagnoses.subjects"
              >
                {{ formatNumber(stats.diagnoses.subjects) }} subjects
              </div> -->
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Diagnoses
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Total diagnostic records and unique diagnosis terms
            </p>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Procedures Card -->
      <VaCard class="hover:shadow-lg transition-shadow">
        <VaCardContent>
          <div class="flex items-start justify-between">
            <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <i-mdi-medical-bag
                class="text-2xl text-purple-600 dark:text-purple-400"
              />
            </div>
            <div class="flex flex-col items-end">
              <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatNumber(stats.procedures) }}
              </div>
              <!-- <div
                class="text-sm va-text-secondary"
                v-if="stats.procedures.subjects"
              >
                {{ formatNumber(stats.procedures.subjects) }} subjects
              </div> -->
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Procedures
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Total procedures performed and unique procedure types
            </p>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Encounters Card -->
      <VaCard class="hover:shadow-lg transition-shadow">
        <VaCardContent>
          <div class="flex items-start justify-between">
            <div class="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <i-mdi-calendar-clock
                class="text-2xl text-orange-600 dark:text-orange-400"
              />
            </div>
            <div class="flex flex-col items-end">
              <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatNumber(stats.encounters) }}
              </div>
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Encounters
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Total visits and number of subjects with encounters
            </p>
          </div>
        </VaCardContent>
      </VaCard>
    </div>
  </div>
</template>

<script setup>
import statsService from "@/services/hdw/statistics";
const stats = ref({
  subjects: 0,
  diagnoses: 0,
  procedures: 0,
  encounters: 0,
});

function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

onMounted(() => {
  statsService
    .get()
    .then((res) => {
      stats.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    });
});
</script>
