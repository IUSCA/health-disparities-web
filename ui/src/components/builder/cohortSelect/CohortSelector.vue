<template>
  <va-card>
    <va-card-content>
      <div class="flex flex-wrap items-center gap-y-3">
        <!-- array of cohorts -->
        <div
          v-for="(cohort, idx) in cohorts"
          :key="cohort.id"
          class="flex items-center"
        >
          <!-- Cohort details -->
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
              <div class="text-sm va-text-secondary w-[72px]">
                <span class="font-semibold">
                  {{ cohort.size }}
                </span>
                <span> pax. </span>
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
              size="small"
            >
              <Icon
                :icon="combinations[logicalOperators[idx]].icon"
                class="text-2xl"
              />
            </va-button>
          </div>
        </div>

        <!-- Add cohort button -->
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
              <!-- opens the CohortSearchModal -->
              <!-- which emits select event when user clicks on cohort from search resutls -->
              <!-- addCohort is the handler -->
              <va-button
                @click="cohortSearchModal.show"
                preset="secondary"
                icon="search"
                class="cohort-select-buttons"
              >
                Search Cohorts
              </va-button>
            </div>
          </VaDropdownContent>
        </VaDropdown>
      </div>
    </va-card-content>
  </va-card>

  <CohortSearchModal ref="cohortSearchModal" @select="addCohort" />
  <CombineCohortsModal ref="combineCohortsModal" />
</template>

<script setup>
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";
import { DEFAULT_LOGICAL_OPERATOR, combinations } from "./combineCohorts";

const cohortsStore = useCohortsStore();
const { cohorts, operators: logicalOperators } = storeToRefs(cohortsStore);

// const props = defineProps({});

const cohortSearchModal = ref(null);
const combineCohortsModal = ref(null);

function changeCombinationLogic(left_operand_idx) {
  console.log("Change Combination Logic", left_operand_idx);
  combineCohortsModal.value.show(left_operand_idx);
}

function addNewCohort() {
  // add an empty cohort
  cohortsStore.appendCohort(
    cohortsStore.makeEmptyCohort(),
    DEFAULT_LOGICAL_OPERATOR,
  );
}

function addCohort(cohort) {
  // add an existing cohort
  cohortsStore.appendCohort(
    cohortsStore.transformStoredCohort(cohort),
    DEFAULT_LOGICAL_OPERATOR,
  );
}
</script>

<style scoped>
.cohort-select-buttons {
  --va-button-justify-content: left;
}
</style>
