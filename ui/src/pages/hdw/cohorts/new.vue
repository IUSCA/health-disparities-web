<template>
  <div class="flex flex-row gap-5">
    <!-- Left Panel -->
    <div class="w-full flex flex-col items-start gap-5">
      <VaCard class="w-full">
        <VaCardTitle>
          <span class="text-base"> Define Cohort Criteria </span>
        </VaCardTitle>
        <VaCardContent>
          <div class="flex flex-col gap-5 w-[600px] mt-4">
            <div class="flex gap-3 items-center w-full">
              <label for="age-range-slider" class="w-[120px] va-text-primary">
                Age Range
              </label>
              <VaSlider
                id="age-range-slider"
                v-model="ageRange"
                class="age-range-slider flex-1"
                range
                track-label-visible
                :min="0"
                :max="100"
              />
              <VaButton
                color="secondary"
                preset="secondary"
                icon="refresh"
                @click="resetDemographics"
                class="ml-2"
              >
                Reset
              </VaButton>
            </div>

            <div class="flex gap-3 items-center w-full">
              <label for="hdw-cohort-gender" class="w-[120px] va-text-primary">
                Gender
              </label>
              <VaSelect
                id="hdw-cohort-gender"
                v-model="gender"
                class=""
                :options="genderOptions"
                value-by="value"
                text-by="label"
              />
            </div>
          </div>

          <VaDivider class="my-5" />

          <div class="flex gap-3 items-start mt-5">
            <label for="launch_dx_search" class="w-[120px] va-text-primary">
              Diagnoses
            </label>
            <div>
              <div class="flex items-center gap-2 mb-2">
                <VaButton
                  preset="primary"
                  icon="search"
                  id="launch_dx_search"
                  size="small"
                  borderColor="primary"
                  @click="openDxSearch"
                >
                  Search for Diagnoses
                </VaButton>

                <VaButton
                  color="secondary"
                  preset="secondary"
                  icon="refresh"
                  @click="resetDx"
                  class="ml-2"
                >
                  Reset
                </VaButton>
              </div>

              <div v-if="selected_dx.length > 0"></div>
            </div>
          </div>

          <VaDivider class="my-5" />

          <div class="flex gap-3 items-start mt-5">
            <label
              for="launch_procedures_search"
              class="w-[120px] va-text-primary"
            >
              Procedures
            </label>
            <div>
              <div class="flex items-center gap-2 mb-2">
                <VaButton
                  preset="primary"
                  icon="search"
                  id="launch_procedures_search"
                  size="small"
                  borderColor="primary"
                  @click="openProceduresSearch"
                >
                  Search for Procedures
                </VaButton>

                <VaButton
                  color="secondary"
                  preset="secondary"
                  icon="refresh"
                  @click="resetProcedures"
                  class="ml-2"
                >
                  Reset
                </VaButton>
              </div>

              <div v-if="selected_dx.length > 0"></div>
            </div>
          </div>
        </VaCardContent>
      </VaCard>
    </div>

    <!-- Right Panel -->
    <div class="flex-none">
      <VaCard class="mb-5 max-w-[480px]">
        <VaCardTitle>
          <span class="text-base"> Cohort Size </span>
        </VaCardTitle>
        <VaCardContent>
          <div
            :class="{
              'flex items-center justify-center text-2xl min-h-[80px] transition-all duration-300': true,
              'opacity-90 animate-pulse': loading,
            }"
          >
            <div class="flex items-center justify-center">
              <span
                :class="{
                  'text-4xl font-bold tracking-wide transition-all duration-300': true,
                  'text-blue-600 dark:text-blue-400': !loading,
                  'text-gray-200 dark:text-gray-700': loading,
                }"
              >
                <NumberTransition :target="size" />
              </span>
              <span class="text-sm ml-1 text-gray-600 dark:text-gray-400">
                subjects
              </span>
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <VaCard class="max-w-[480px]">
        <VaCardTitle>
          <span class="text-base"> Save Cohort </span>
        </VaCardTitle>
        <VaCardContent>
          <VaForm ref="formRef" class="flex flex-col gap-3 px-4">
            <VaInput
              label="Name"
              placeholder="Enter cohort name"
              v-model="cohort_name"
              required-mark
              :rules="[(v) => !!v || 'Name is required']"
            />

            <VaTextarea
              label="Description"
              placeholder="Describe your cohort"
              v-model="cohort_description"
            />

            <div class="flex justify-center">
              <VaButton
                class="mr-2 flex-1 max-w-md"
                color="success"
                :disabled="loading || size === 0 || !isValid"
                @click="createCohort"
              >
                <div class="flex items-center">
                  <i-mdi-plus class="mr-2" />
                  <span> Create Cohort </span>
                </div>
              </VaButton>
            </div>
          </VaForm>
        </VaCardContent>
      </VaCard>
    </div>
  </div>

  <HDWDxSearch
    ref="dxSearchModal"
    :selected-list="selected_dx"
    @select="handleDxSelect"
  />
</template>

<script setup>
import cohortService from "@/services/hdw/cohorts";
import searchService from "@/services/hdw/search";
import { useForm } from "vuestic-ui";
// const props = defineProps({});

const { isValid, validate } = useForm("formRef");
const router = useRouter();

const ageRange = ref([0, 100]);
const gender = ref(null);
const selected_dx = ref([]);
const selected_procedures = ref([]);
const cohort_name = ref("");
const cohort_description = ref("");
const size = ref(0);
const loading = ref(false);

const dxSearchModal = ref(null);
const proceduresSearchModal = ref(null);

const genderOptions = [
  { label: "All", value: null },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

const resetDemographics = () => {
  ageRange.value = [0, 100];
  gender.value = null;
};

const resetDx = () => {
  selected_dx.value = [];
};

const resetProcedures = () => {
  selected_procedures.value = [];
};

// {
//   demographic: {
//     age: {
//       min: 20,
//     },
//     gender: "Female",
//   },
//   dx: {
//     code: ["I10", "E11.9"],
//   },
//   procedure: {
//     code: ["123", "456"],
//   },
// }

const searchSubjects = useDebounceFn(function (query) {
  console.log("body", query);
  searchService
    .subjects(query)
    .then((response) => {
      size.value = response.data.length;
    })
    .finally(() => {
      loading.value = false;
    });
}, 500);

function createBody() {
  const body = {};
  if (
    ageRange.value[0] >= 0 &&
    ageRange.value[1] <= 100 &&
    ageRange.value[0] <= ageRange.value[1] &&
    !(ageRange.value[0] === 0 && ageRange.value[1] === 100)
  ) {
    body.demographic = {};
    body.demographic.age = {
      min: ageRange.value[0],
      max: ageRange.value[1],
    };
  }
  if (gender.value) {
    if (!body.demographic) {
      body.demographic = {};
    }
    body.demographic.gender = gender.value;
  }
  if (selected_dx.value.length > 0) {
    body.dx = {};
    body.dx.code = selected_dx.value.map((dx) => dx.code);
  }
  if (selected_procedures.value.length > 0) {
    body.procedure = {};
    body.procedure.code = selected_procedures.value.map((p) => p.code);
  }
  return body;
}

watch(
  [ageRange, gender, selected_dx, selected_procedures],
  () => {
    const body = createBody();
    if (JSON.stringify(body) === JSON.stringify({})) {
      size.value = 0;
      return;
    }
    loading.value = true;
    searchSubjects(body);
  },
  {
    deep: true,
  },
);

function createCohort() {
  validate();
  if (!isValid.value) return;

  const body = createBody();
  if (JSON.stringify(body) === JSON.stringify({})) {
    size.value = 0;
    return;
  }
  loading.value = true;
  cohortService
    .create({
      name: cohort_name.value,
      description: cohort_description.value,
      query: body,
    })
    .then((res) => {
      console.log("res", res);
      router.push("/cohorts");
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
}

function openDxSearch() {
  dxSearchModal.value.show();
}

function openProceduresSearch() {
  proceduresSearchModal.value.show();
}

function handleDxSelect(selected) {
  selected_dx.value = selected;
}
</script>

<style scoped>
.age-range-slider {
  --va-slider-dot-value-font-size: 0.8rem;
}
</style>

<route lang="yaml">
meta:
  title: Create Cohort
</route>
