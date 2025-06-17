<template>
  <VaInnerLoading :loading="loading">
    <!-- form -->
    <div class="mt-5">
      <VaForm ref="formRef" class="flex flex-col gap-3">
        <span class="font-semibold">Choose an option to identify a cohort</span>
        <VaOptionList
          v-model="category"
          :options="categoryOptions"
          type="radio"
          text-by="label"
          value-by="value"
          :rules="[(v) => !!v || 'Item is required']"
        />
        <VaInput
          label="Substring to search:"
          v-model="searchString"
          :rules="[(v) => !!v || 'Search string is required']"
        />
        <VaButton @click="search" class="flex-initial" :disabled="!isValid">
          Submit
        </VaButton>
      </VaForm>
    </div>
    <div class="h-full overflow-scroll mt-5" v-if="results.length > 0">
      <VaList>
        <VaListLabel> Results </VaListLabel>
        <VaListItem
          v-for="(r, index) in results"
          :key="index"
          class="list__item"
        >
          {{ r }}
        </VaListItem>
      </VaList>
    </div>

    <!-- results -->
    <div></div>
  </VaInnerLoading>
</template>

<script setup>
import cohorts from "@/services/hdw/cohorts";
import { useForm } from "vuestic-ui";

const { isValid, validate } = useForm("formRef");

// const props = defineProps({});
const category = ref();
const searchString = ref("");
const loading = ref(false);
const results = ref([]);
const formRef = ref(null);

const categoryOptions = [
  { label: "Diagnosis", value: "diagnosis" },
  { label: "Med Orders", value: "meds" },
  { label: "Procedures", value: "procedures" },
  { label: "Non-med Orders", value: "nonMedOrders" },
];

function search() {
  validate();
  if (!isValid.value) return;
  loading.value = true;
  cohorts
    .search({
      category: category.value,
      searchString: searchString.value,
    })
    .then((res) => {
      results.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>

<route lang="yaml">
meta:
  title: Cohort Search
  nav: [{ label: "Cohort Search" }]
</route>
