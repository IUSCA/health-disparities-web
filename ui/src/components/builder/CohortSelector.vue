<template>
  <va-card>
    <va-card-content>
      <div class="flex items-center">
        <div
          v-for="(cohort, idx) in cohorts"
          :key="cohort.id"
          class="flex items-center"
        >
          <div class="flex flex-nowrap items-start gap-2">
            <!-- icon -->
            <div>
              <i-mdi-account-group
                class="text-2xl"
                :style="{
                  color: stringToRGB(`${cohort.id}-${cohort.name}`),
                }"
              />
            </div>
            <!-- details -->
            <div>
              <div class="leading-4">{{ cohort.name }}</div>
              <div class="text-sm va-text-secondary">
                <span class="font-semibold">
                  {{ cohort.participants }}
                </span>
                <span> participants </span>
              </div>
            </div>
          </div>

          <!-- combination logic -->
          <div v-if="idx < logicalOperators.length" class="mx-3">
            <va-button
              @click="changeCombinationLogic(idx)"
              :title="combinations[logicalOperators[idx]].label"
              preset="secondary"
              color="secondary"
            >
              <Icon
                :icon="combinations[logicalOperators[idx]].icon"
                class="text-xl"
              />
            </va-button>
          </div>
        </div>

        <VaDropdown :offset="[0, 40]">
          <template #anchor>
            <va-button
              color="primary"
              icon="add"
              round
              class="ml-5"
              :disabled="cohorts.length >= 5"
              v-if="cohorts.length > 0"
            />
            <va-button color="primary" icon="add" round class="ml-5" v-else>
              Add Cohort
            </va-button>
          </template>

          <VaDropdownContent>
            <div class="flex flex-col gap-1 py-1">
              <!-- new cohort button -->
              <va-button
                @click="addNewCohort"
                preset="secondary"
                icon="add"
                class="text-left cohort-select-buttons"
              >
                New Cohort
              </va-button>

              <!-- Search for cohort -->
              <va-button
                @click="cohortSearchModal.show"
                preset="secondary"
                icon="search"
                class="cohort-select-buttons"
              >
                Search Cohort
              </va-button>
            </div>
          </VaDropdownContent>
        </VaDropdown>
      </div>
    </va-card-content>
  </va-card>

  <CohortSearchModal ref="cohortSearchModal" @select="addCohort" />
</template>

<script setup>
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const { cohorts, operators: logicalOperators } = storeToRefs(cohortsStore);

// const props = defineProps({});

const combinations = {
  union: { key: "union", label: "Union", icon: "mdi-vector-union" },
  intersection: {
    key: "intersection",
    label: "Intersection",
    icon: "mdi-vector-intersection",
  },
  difference: {
    key: "difference",
    label: "Difference",
    icon: "mdi-vector-difference",
  },
  symmetric_difference: {
    key: "symmetric_difference",
    label: "Unique",
    icon: "mdi-delta",
  },
};
const DEFAULT_LOGICAL_OPERATOR = "union";

const cohortSearchModal = ref(null);

function changeCombinationLogic(idx) {
  console.log("Change Combination Logic", idx);
}

function addNewCohort() {
  cohortsStore.appendCohort(
    cohortsStore.makeEmptyCohort(),
    DEFAULT_LOGICAL_OPERATOR,
  );
}

function addCohort(cohort) {
  cohortsStore.appendCohort(cohort, DEFAULT_LOGICAL_OPERATOR);
}
</script>

<style scoped>
.cohort-select-buttons {
  --va-button-justify-content: left;
}
</style>
