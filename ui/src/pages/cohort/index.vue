<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

import { useCohortStore } from "@/stores/cohort"
import cohortService from '@/services/cohort'
import { useToastStore } from "@/stores/toast";
import { useNavStore } from "@/stores/nav";
const nav = useNavStore();
nav.setNavItems([
  {
    label: `Cohort`,
  },
]);

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// INIT
const cohortStore = useCohortStore()
cohortStore.getCategories()

const showSettings = ref(false)
const participants = ref(0)
const cohort_name = ref("")
const cohort_options = ref([])
const toast = useToastStore();
const loading = ref(false)

const results = ref({})
const chart_data = ref("")
const chart_category = ref("")
const chart_options = ref([])
const resultsBy = ref("")
const resultsByDetails = ref({NEW: []})

onMounted(async () => {
  cohortService.getResultsBy().then(results => {
    for(let data of results.data) {
      resultsByDetails.value[data.name] = data.fields
    }
  })
  cohortService.getMyCohorts().then(results => {
    console.log(results.data)
    for(let result of results.data) {
      console.log(result)
      addNewOption(result.name, result.id, result.query)
    }
  })
})

const addNewOption = (newOption, id = null, query = null) => {
      const option = {
        id: id ? id : String(cohort_options.value.length),
        text: newOption,
        value: query ? query : newOption,
      };
      cohort_options.value = [...cohort_options.value, option];
}

const showCohort = (cohort) => {
  if(cohort.text === cohort.value)
    return

  console.log(cohort)

  includes.value = cohort.value.includes
  excludes.value = cohort.value.excludes

}


const saveCohort = async () => {
  if(!cohort_name.value || !checkValues(includes.value) ) {
    toast.error("Please fill all the fields")
    return
  }

  if(cohort_name.value.text === cohort_name.value.value) {
    await cohortService.saveCohort({cohort_name: cohort_name.value.text, includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  } else {
    await cohortService.saveCohort({cohort_name: cohort_name.value.text, includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value], id: cohort_name.value.id})
  }


  toast.success("Cohort Saved")
}


const includes = ref([{
    group: 1,
    query: [{
      edit: true,
      join: "",
      category: "",
      op: "",
      operators: [],
      field: "",
      options: [],
      val: "",
      values: []
    }]
}])

const excludes = ref([{
    group: 1,
    query: [{
      edit: true,
      join: "",
      category: "",
      op: "",
      operators: [],
      field: "",
      options: [],
      val: "",
      values: []
    }]
}])





const save = (data) => {
  resultsByDetails.value[data.name] = data.fields
  resultsBy.value = data.name
  showSettings.value = false
}



const checkValues = (obj) => {
    for (let key in obj) {
        if (Array.isArray(obj[key])) {
            for (let item of obj[key]) {
                if (typeof item === 'object' && item !== null) {
                    if ('val' in item && item.val === "") {
                        return false;
                    }
                    if (!checkValues(item)) {
                        return false;
                    }
                }
            }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if ('val' in obj[key] && obj[key].val === "") {
                return false;
            }
            if (!checkValues(obj[key])) {
                return false;
            }
        }
    }
    return true;
}


watchDebounced([resultsBy, includes, excludes], () => {
  
  // If required fields are not filled out, return
  if(resultsBy.value === "" || !checkValues(includes.value))
    return

  // Reset
  chart_category.value = null
  chart_data.value = null
  loading.value = true

  // Get Results
  cohortService.resultsBy({includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  .then(result => {


    // Set Participants
    participants.value = result.data.participants

    // Remove from results
    delete result.data.participants

    // Set Results
    results.value = result.data

    // Set Chart Options
    chart_category.value = Object.keys(result.data)[0]
    chart_options.value = Object.keys(result.data)

    // Set loading
    loading.value = false
  })
}, { deep: true, debounce: 500 })


watch(chart_category, () => {
  if(!chart_category.value)
    return

  let labels = []
  let dataset = {data: []}

  for(const key of Object.keys(results.value[chart_category.value])) {
    labels.push(key)
    dataset.data.push(results.value[chart_category.value][key])
  }

  chart_data.value = {
    labels: labels,
    datasets: [dataset]
  }
}, {deep: true})





const numFormat = (num) => num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")



</script>

<template>
  <div class="flex flex-col">
  
      <div class="flex flex-row mb-4">
        <!-- <va-input class="w-2   w-full rounded" v-model="cohort_name" label="Cohort"  /> -->
        <va-select  class="w-2  w-full rounded" v-model="cohort_name" label="Cohort" :options="cohort_options" searchable highlight-matched-text allow-create="unique" @create-new="addNewOption" @update:modelValue="showCohort(cohort_name)" />
      </div>
      <div class=" grid gap-4 grid-cols-3 w-full mb-12">
        <va-card stripe stripe-color="success" >
          <va-card-title><h1 class="text-xl  mx-auto">Includes</h1></va-card-title>
          <va-card-content>
            <Group v-model="includes" />
          </va-card-content>
        </va-card>
        <va-card stripe stripe-color="danger">
          <va-card-title><h1 class="text-xl  mx-auto">Excludes</h1></va-card-title>
          <va-card-content>
            <Group v-model="excludes" />
          </va-card-content>
        </va-card>
        <va-card stripe stripe-color="info">
          <va-card-title><h1 class="text-xl  mx-auto">Preview</h1></va-card-title>
          <va-card-content>
            <div class="flex flex-col items-center">
              <div class="text-xl mb-2">Participants: &nbsp; <span v-if="participants != 'loading'">{{ numFormat(participants) }}</span><span v-else-if="participants == 'loading'">
              <br />
              <va-progress-circle indeterminate class="mx-auto" />
              </span></div>
            </div>
            <div class="flex">
              
              <va-select class="w-full rounded" v-model="resultsBy" :options="Object.keys(resultsByDetails)" />
              <va-button class="flex flex-row   ml-2 pl-2" preset="secondary" border-color="primary" @click="showSettings = !showSettings"><Icon icon="mdi:cog" /> &nbsp; </va-button>
            </div>
            <div v-if="chart_data">
  
              <va-button-toggle class="mx-auto my-2" v-model="chart_category" :options="chart_options" preset="secondary" border-color="primary" />
  
  
              <Bar  id="my-chart-id" :key="chart_data" :options="{ responsive: true, indexAxis: 'y',  plugins: {legend: {display: false}}, backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(255, 159, 64, 0.2)',
                'rgba(255, 205, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(201, 203, 207, 0.2)'
              ],
              borderColor: [
                'rgb(255, 99, 132)',
                'rgb(255, 159, 64)',
                'rgb(255, 205, 86)',
                'rgb(75, 192, 192)',
                'rgb(54, 162, 235)',
                'rgb(153, 102, 255)',
                'rgb(201, 203, 207)'
              ],
              borderWidth: 1}" :data="chart_data" />
            </div>
            <div v-else-if="loading">
              <br />
              <va-progress-circle indeterminate class="mx-auto" />
            </div>
            <div v-else>
              <br />
              <h1 class="text-center text-base">No Results.</h1>
            </div>
          </va-card-content>
        </va-card>
      </div>
      <va-button @click="saveCohort" class="" preset="secondary" border-color="primary" ><Icon icon="material-symbols:save-sharp" /> &nbsp; Save </va-button>
  </div>
  
  <va-modal v-model="showSettings"  size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
    <Settings class="w-full h-3/4" @save="save" />
  </va-modal>
  

  
  
  </template>