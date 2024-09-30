<script setup>
import DynamicChart from "@/components/charts/echarts/DynamicChart.vue";
import Pie from "@/components/charts/echarts/Pie.vue";
import Timeline from "@/components/charts/echarts/Timeline.vue";
import participantsService from "@/services/participants";
import { useNavStore } from "@/stores/nav";

const nav = useNavStore();
nav.setNavItems([], true);

const { id } = defineProps({ id: String });

nav.setNavItems([
  {
    label: `Participants`,
    to: "/participants",
  },
  {
    label: `Patient ${id}`,
  },
]);

const details = ref({});
const data = ref({});

const dateRange = ref([new Date(details.value.dob), Date.now()]);

const category = ref("Overview");
const categories = ref([
  "Overview",
  "Diagnosis",
  "Medications",
  "Labs",
  "Hospital Visits",
  "Covid Tests",
  "Covid Vaccines"
]);

const views = ref([
  { value: "timeline", icon: "schedule" },
  { value: "graph", icon: "analytics" },
  { value: "data", iconRight: "dataset" },
]);

const view = ref("timeline");

const getData = async () => {
  data.value = {};

  data.value = (
    await participantsService.getCategoryDetails({
      id,
      category: category.value,
      view: view.value,
      dateRange: dateRange.value,
    })
  ).data;
};

onMounted(async () => {
  try {
    const detailData = (await participantsService.getDetails(id)).data;

    console.log(detailData);
    details.value = {
      dob: detailData.demographics[0].dob,
      race: detailData.demographics[0].race,
      ethnicity: detailData.demographics[0].ethnicity,
      gender: detailData.demographics[0].gender
    }

    await getData();
    dateRange.value = [
      new Date(details.value.dob),
      "death" in details.value &&
      details.value.death &&
      details.value.death_date !== null
        ? new Date(details.value.death_date)
        : Date.now(),
    ];
  } catch (err) {
    console.error(err);
  }
});

const age = computed(() => {
  if (details.value.dob === undefined) return "";
  const dob = new Date(details.value.dob);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  return Math.abs(age_dt.getUTCFullYear() - 1970);
});

const capitalizeFirstLetter = (string) => {
  if (string === undefined) return "";
  console.log(string);
  const firstLetter = string.length > 0 ? string[0] : "";
  return firstLetter.toUpperCase();
};

watch(
  [category, view],
  () => {
    getData();
  },
  { deep: true },
);

const prepareOverviewData = (data) => {
  const preppedData = [];
  for (const [key, _value] of Object.entries(data)) {
    preppedData.push({ name: key, value: data[key].date.length });
  }
  return preppedData;
};

const updateDateRange = (range) => {
  console.log(range);
  dateRange.value = range;
  // getData();
};
</script>

<template>
  <div>
    <VaDivider orientation="center">
      <span class="px-2">Details</span>
    </VaDivider>

    <!-- {{ details }} -->
    <div class="flex justify-between">
      <div class="flex">
        <div class="ml-3">
          <h1 class="text-xl font-bold">
            {{ capitalizeFirstLetter(details.gender) }}
          </h1>
          <h2 class="text-base">
            Age: {{ age }} ({{
              new Date(details.dob).toLocaleDateString()
            }})
          </h2>
        </div>
      </div>
      <div v-if="details.race">
        <h2 class="text-lg font-bold">Race</h2>
        <p>{{ details.race }}</p>
      </div>
      <div v-if="details.ethnicity">
        <h2 class="text-lg font-bold">Ethnicity</h2>
        <p>{{ details.ethnicity }}</p>
      </div>
    </div>
    <VaDivider orientation="center" class="mt-6"> </VaDivider>
    <div class="flex flex-col mt-4 mb-2">
      <div class="flex justify-between">
        <VaButtonToggle
          preset="secondary"
          border-color="primary"
          v-model="category"
          :options="categories"
        />

        <VaButtonToggle
          border-color="primary"
          preset="secondary"
          v-model="view"
          :options="views"
        />
      </div>
    </div>

    <div v-if="view === 'timeline'">
      <Timeline
        :overview="data"
        :birth-date="details.dob"
        :date-range="dateRange"
        @update:dateRange="updateDateRange"
        v-if="Object.keys(data).length > 0"
      />
      <VaInnerLoading loading :size="60" v-else />
    </div>
    <div v-else-if="view === 'graph' && category === 'Overview'">
      <div class="grid grid-cols-2" v-if="Object.keys(data).length > 0">
        <div v-for="chart in Object.keys(data)" :key="chart">
          <VaCard class="m-2">
            <VaCardContent>
              <Pie :title="chart" :data="prepareOverviewData(data[chart])" />
            </VaCardContent>
          </VaCard>
        </div>
      </div>
      <div v-else class="mt-12">
        <VaInnerLoading loading :size="60" />
      </div>
    </div>
    <div v-else-if="view === 'graph' && category !== 'Overview'">
      <div class="w-full mt-8">
        <VaSlider
          v-model="dateRange"
          range
          :min="new Date(details.dob)"
          :max="Date.now()"
          @change="getData"
        >
          <template #trackLabel="{ value }">
            <VaChip size="small">
              {{ new Date(value).toLocaleDateString() }}
            </VaChip>
          </template>
        </VaSlider>
        <div class="flex">
          <VaDateInput
            v-model="dateRange[0]"
            type="date"
            label="Start Date"
            @change="getData"
          />
          <span class="mx-2 w-2/3"></span>
          <VaDateInput
            v-model="dateRange[1]"
            type="date"
            label="End Date"
            @change="getData"
          />
        </div>
      </div>
      <div class="grid grid-cols-3" v-if="Object.keys(data).length > 0">
        <div v-for="chart in Object.keys(data)" :key="chart">
          <DynamicChart
            v-if="data[chart].date.length > 0"
            :data="{
              title: chart,
              dateRange: [...data[chart].date],
              dataRange: [...data[chart].value],
              label: data[chart].unit,
            }"
          />
        </div>
      </div>
      <div v-else class="mt-12">
        <VaInnerLoading loading :size="60" />
      </div>
    </div>
  </div>
</template>

<style>
.line-chart-container {
  width: 100%;
}
</style>
