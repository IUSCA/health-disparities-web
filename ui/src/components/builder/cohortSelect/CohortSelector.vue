<template>
  <va-card>
    <va-card-content>
      <div class="flex flex-wrap items-center gap-y-3">
        <!-- combination result -->
        <CombinedCohort v-if="cohorts.length >= 2" />
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
              <div class="text-lg font-semibold leading-4">
                {{ cohort.name }}
              </div>
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
        <AddCohortButton />
      </div>
    </va-card-content>
  </va-card>

  <CombinationLogicModal ref="combinationLogicModal" />
</template>

<script setup>
import { combinations } from "@/components/builder/cohortSelect/combination/constants";
import { stringToRGB } from "@/services/colors";
import { useCohortsStore } from "@/stores/cohorts";
import { storeToRefs } from "pinia";

const cohortsStore = useCohortsStore();
const { cohorts, operators: logicalOperators } = storeToRefs(cohortsStore);

// const props = defineProps({});

const combinationLogicModal = ref(null);

function changeCombinationLogic(left_operand_idx) {
  combinationLogicModal.value.show(left_operand_idx);
}
</script>
