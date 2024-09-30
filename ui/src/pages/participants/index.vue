<script setup>
import participantsService from "@/services/participants";
import { useNavStore } from "@/stores/nav";
import { useRouter } from "vue-router";

const router = useRouter();
const nav = useNavStore();
const patients = ref();

const count = ref(0);
const pageOptions = [1, 5, 10, 25, 50, 100];

const pages = computed(() =>
  Math.floor(count.value / options.value.numPerPage),
);

nav.setNavItems([
  {
    label: `Participants`,
  },
]);

const getData = async () => {
  const results = await participantsService.getAll({
    currentPage: options.value.page,
    itemsPerPage: options.value.numPerPage,
    sortBy: options.value.sortBy,
    sortingOrder: options.value.sortingOrder,
  });
  console.log(results);
  patients.value = results.data.data;
  count.value = results.data.count;
};

onMounted(async () => {
  try {
    await getData();
  } catch (err) {
    console.error(err);
  }
});

const selectPatient = (id) => {
  router.push(`/participants/${id}`);
};

const calculateAge = (birthDate) => {
  if (birthDate === undefined) return "";
  const dob = new Date(birthDate);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  return Math.abs(age_dt.getUTCFullYear() - 1970);
};

const options = ref({
  sortBy: "id",
  sortingOrder: "asc",
  numPerPage: 10,
  page: 1,
});

watch(
  () => [
    options.value.sortBy,
    options.value.sortingOrder,
    options.value.numPerPage,
    options.value.page,
  ],
  () => {
    console.log("sorting...");
    getData();
  },
  { deep: true },
);

const sortBy = (col) => {
  if (options.value.sortBy === col) {
    options.value.sortingOrder =
      options.value.sortingOrder === "asc" ? "desc" : "asc";
  } else {
    options.value.sortBy = col;
    options.value.sortingOrder = "asc";
  }
};
</script>

<template>
  <div class="va-table-responsive">
    <table class="va-table w-full va-table--striped">
      <thead>
        <tr>
          <th>
            <button class="text-base" @click="sortBy('id')">
              Person ID &nbsp;<i-mdi-arrow-up
                v-if="
                  options.sortBy === 'id' &&
                  options.sortingOrder === 'asc'
                "
              />
              <i-mdi-arrow-down
                v-if="
                  options.sortBy === 'id' &&
                  options.sortingOrder === 'desc'
                "
              />
            </button>
          </th>
          <th>
            <button class="text-base" @click="sortBy('gender_source_value')">
              Gender &nbsp;<i-mdi-arrow-up
                v-if="
                  options.sortBy === 'gender_source_value' &&
                  options.sortingOrder === 'asc'
                "
              />
              <i-mdi-arrow-down
                v-if="
                  options.sortBy === 'gender_source_value' &&
                  options.sortingOrder === 'desc'
                "
              />
            </button>
          </th>
          <th>
            <button class="text-base" @click="sortBy('ethnicity_source_value')">
              Ethnicity &nbsp;<i-mdi-arrow-up
                v-if="
                  options.sortBy === 'ethnicity_source_value' &&
                  options.sortingOrder === 'asc'
                "
              />
              <i-mdi-arrow-down
                v-if="
                  options.sortBy === 'ethnicity_source_value' &&
                  options.sortingOrder === 'desc'
                "
              />
            </button>
          </th>
          <th>
            <button class="text-base" @click="sortBy('race_source_value')">
              Race &nbsp;<i-mdi-arrow-up
                v-if="
                  options.sortBy === 'race_source_value' &&
                  options.sortingOrder === 'asc'
                "
              />
              <i-mdi-arrow-down
                v-if="
                  options.sortBy === 'race_source_value' &&
                  options.sortingOrder === 'desc'
                "
              />
            </button>
          </th>

          <th>
            <button class="text-base" @click="sortBy('birth_datetime')">
              Age &nbsp;<i-mdi-arrow-up
                v-if="
                  options.sortBy === 'birth_datetime' &&
                  options.sortingOrder === 'asc'
                "
              />
              <i-mdi-arrow-down
                v-if="
                  options.sortBy === 'birth_datetime' &&
                  options.sortingOrder === 'desc'
                "
              />
            </button>
          </th>

          <th>Actions</th>
        </tr>
      </thead>
      <tbody>



        <tr v-for="patient in patients" :key="patient.id">
          <td>{{ patient.id }}</td>
          <td>{{ patient.demographics[0].gender }}</td>
          <td>{{ patient.demographics[0].ethnicity }}</td>
          <td>{{ patient.demographics[0].race }}</td>
          <td>{{ calculateAge(patient.demographics[0].dob) }}</td>
          <td>
            <va-button @click="selectPatient(patient['id'])"
              ><i-clarity:details-line /> Details</va-button
            >
          </td>
        </tr>
      </tbody>
    </table>
    <div class="mt-2 flex flex-row content-end">
      <va-select
        class="w-2 w-full rounded"
        v-model="options.numPerPage"
        :options="pageOptions"
        label="Number Per Page"
      />
      <b class="pt-2 ml-2">Total: {{ count }}</b>
      <va-pagination input v-model="options.page" :pages="pages" />
    </div>
  </div>
</template>
