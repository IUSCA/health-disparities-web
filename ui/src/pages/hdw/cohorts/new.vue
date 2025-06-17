<template>
  <div class="flex flex-row gap-5">
    <!-- Left Panel -->
    <div class="flex-none flex flex-col items-start gap-5">
      <VaCard>
        <VaCardTitle>
          <div class="flex items-center justify-between w-full">
            <p class="text-base">Demographics</p>
            <VaButton
              preset="plain"
              class="flex-none ml-auto"
              @click="resetDemographics"
              icon="refresh"
              color="secondary"
            >
              Reset
            </VaButton>
          </div>
        </VaCardTitle>
        <VaCardContent>
          <VaForm class="flex flex-col gap-3 w-[480px] px-4 mt-4">
            <VaSlider
              label="Age Range"
              v-model="ageRange"
              class="mb-6 age-range-slider"
              range
              track-label-visible
              :min="0"
              :max="100"
            />

            <VaSelect
              label="Gender"
              v-model="gender"
              class="mb-6"
              :options="genderOptions"
              value-by="value"
              text-by="label"
            />
          </VaForm>
        </VaCardContent>
      </VaCard>

      <div class="">
        <VaCard>
          <VaCardTitle>
            <div class="flex items-center justify-between w-full">
              <p class="text-base">Diagnoses</p>
              <VaButton
                preset="plain"
                class="flex-none ml-auto"
                @click="resetDx"
                icon="refresh"
                color="secondary"
              >
                Reset
              </VaButton>
            </div>
          </VaCardTitle>
          <VaCardContent>
            <div class="w-[480px]">
              <HDWDxSelect v-model="selected_dx" />
            </div>
          </VaCardContent>
        </VaCard>
      </div>

      <div class="">
        <VaCard>
          <VaCardTitle>
            <div class="flex items-center justify-between w-full">
              <p class="text-base">Procedures</p>
              <VaButton
                preset="plain"
                class="flex-none ml-auto"
                @click="resetProcedures"
                icon="refresh"
                color="secondary"
              >
                Reset
              </VaButton>
            </div>
          </VaCardTitle>
          <VaCardContent>
            <div class="w-[480px]">
              <ProcedureSelect v-model="selected_procedures" />
            </div>
          </VaCardContent>
        </VaCard>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="flex-1">
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
          <span class="text-base"> Create Cohort </span>
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
