<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

import { useCohortStore } from "@/stores/cohort"
import cohortService from '@/services/cohort'
import { useToastStore } from "@/stores/toast";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const cohortStore = useCohortStore()
cohortStore.getCategories()

const showSettings = ref(false)
const participants = ref(0)
const cohort_name = ref("")
const cohort_options = ref([])
const toast = useToastStore();
const loading = ref(false)

const results = ref({})
const chart_data = ref(null)
const chart_category = ref(null)
const chart_options = ref([])
const resultsBy = ref(null)
const resultsByDetails = ref({NEW: []})

onMounted(async () => {

cohortService.getResultsBy().then(results => {
  console.log(results)
  for(let data of results.data) {
    console.log(data)
    resultsByDetails.value[data.name] = data.fields
  }
})

})


const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

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
  
  console.log(resultsBy.value, includes.value, excludes.value)

  if(!resultsBy.value && !checkValues(includes.value))
    return


  console.log("RESULTBY", resultsBy.value, "DETAILS", resultsByDetails.value[resultsBy.value])

  chart_category.value = null
  chart_data.value = null
  loading.value = true

  cohortService.getResultsByTest({includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  .then(result => {

    console.log(result.data)

    participants.value = result.data.participants

    delete result.data.participants

    results.value = result.data
    console.log(`category ${Object.keys(result.data)[0]}`)

    chart_category.value = Object.keys(result.data)[0]
    chart_options.value = Object.keys(result.data)

    

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


const saveCohort = async () => {
  if(!cohort_name.value || !checkValues(includes.value) ) {
    
    toast.error("Please fill all the fields")
    return
  }

  await cohortService.saveCohort({cohort_name: cohort_name, includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  toast.success("Cohort Saved")
}


const numFormat = (num) => num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
</script>

<template>
  <div class="flex flex-col">
  
      <div class="flex flex-row mb-4">
        <!-- <va-input class="w-2 border-gray-500 border border-solid  w-full rounded" v-model="cohort_name" label="Cohort"  /> -->
        <va-select  class="w-2 border-gray-500 border border-solid w-full rounded" v-model="cohort_name" label="Cohort" :options="cohort_options" multiple searchable highlight-matched-text allow-create="unique" @create-new="addNewOption" />
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
              
              <va-select class="w-full border-gray-800 border border-solid rounded" v-model="resultsBy" :options="Object.keys(resultsByDetails)" />
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