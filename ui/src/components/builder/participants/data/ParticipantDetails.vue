<template>
  <VaInnerLoading :loading="loading">
    <div>
      <!-- Tabs -->
      <VaTabs v-model="selectedCategory" grow class="pt-1">
        <template #tabs>
          <VaTab
            v-for="category in cohortFilters"
            :key="category.key"
            :name="category.key"
          >
            <Icon :icon="category.icon" class="mr-1" />
            <span>{{ category.label }}</span>

            <!-- number of associated records -->
            <span class="w-[30px]">
              <span
                v-if="
                  category.key !== 'demographic' &&
                  (participant[ASSOC_KEYS[category.key]] || []).length > 0
                "
                class="va-text-secondary"
                >({{
                  number_formatter.format(
                    participant[ASSOC_KEYS[category.key]].length,
                  )
                }})
              </span>
            </span>
          </VaTab>
        </template>
      </VaTabs>

      <!-- Content -->
      <VaCard>
        <VaCardContent>
          <component
            v-if="(participant[ASSOC_KEYS[selectedCategory]] || []).length > 0"
            :is="componentMap[selectedCategory]"
            :data="participant[ASSOC_KEYS[selectedCategory]]"
          />
          <div v-else class="flex justify-center items-center">
            <span class="font-semibold va-text-secondary">
              No data available
            </span>
          </div>
        </VaCardContent>
      </VaCard>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import { cohortFilters } from "@/components/builder/cohortFilters";
import cohortService from "@/services/cohort2";
import CovidTests from "./details/CovidTests.vue";
import CovidVaccines from "./details/CovidVaccines.vue";
import Demographic from "./details/Demographics.vue";
import Diagnoses from "./details/Diagnoses.vue";
import Hospitalizations from "./details/Hospitalizations.vue";
import LabResults from "./details/LabResults.vue";
import Medications from "./details/Medications.vue";

const props = defineProps({
  participant_id: {
    type: Number,
    required: true,
  },
});

const componentMap = {
  demographic: Demographic,
  lab: LabResults,
  dx: Diagnoses,
  medication: Medications,
  hospital: Hospitalizations,
  covid_test: CovidTests,
  covid_vax: CovidVaccines,
};

// participant data object has the following keys for each category
const ASSOC_KEYS = {
  demographic: "demographics",
  lab: "labs",
  dx: "dxs",
  medication: "medications",
  hospital: "hospitals",
  covid_test: "covid_tests",
  covid_vax: "covid_vaxes",
};

const number_formatter = Intl.NumberFormat("en", { notation: "compact" });

const selectedCategory = ref("demographic");
const participant = ref({});
const loading = ref(false);

onMounted(() => {
  loading.value = true;
  cohortService
    .getParticipantDetails({ participant_id: props.participant_id })
    .then((res) => {
      participant.value = res.data;
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>
