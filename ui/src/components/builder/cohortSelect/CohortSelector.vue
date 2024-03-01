<template>
  <va-card>
    <va-card-content>
      <div class="flex flex-wrap items-center gap-y-3">
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
              <div class="text-sm va-text-secondary w-[128px]">
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
  <CombineCohortsModal ref="combineCohortsModal" />
</template>

<script setup>
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { defaultQuery } from "../queryBuilder/cohortQueryBuilder";
import { combinations, DEFAULT_LOGICAL_OPERATOR } from "./combineCohorts";

const cohortsStore = useCohortsStore();
const {
  cohorts,
  operators: logicalOperators,
  totalParticipants,
} = storeToRefs(cohortsStore);

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
  const { query, participants, ...rest } = cohort;
  const sanitizedCohort = rest;
  if (_.isEmpty(query)) {
    sanitizedCohort.query = defaultQuery();
    sanitizedCohort.participants = totalParticipants.value;
  } else {
    sanitizedCohort.query = query;
    sanitizedCohort.participants = participants;
  }
  cohortsStore.appendCohort(sanitizedCohort, DEFAULT_LOGICAL_OPERATOR);
}
</script>

<style scoped>
.cohort-select-buttons {
  --va-button-justify-content: left;
}
</style>
