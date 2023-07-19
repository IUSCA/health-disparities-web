<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

import { useCohortStore } from "@/stores/cohort"
import cohortService from '@/services/cohort'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const cohortStore = useCohortStore()

cohortStore.getCategories()

const showSettings = ref(false)
const addModal = ref(false)


const includes =  ref({
  1: [{
    edit: true,
    join: "",
    category: "",
    op: "",
    field: "",
    options: [],
    val: ""
  }]
})

const excludes = ref({
  1: [{
    edit: true,
    join: "",
    category: "",
    op: "",
    field: "",
    options: [],
    val: ""
  }]
})

const getExcludes = (group, index, data) => cohortService.getFields(data).then(result => excludes.value[group][index].options = result.data)
const getIncludes = (group, index, data) => cohortService.getFields(data) .then(result => includes.value[group][index].options = result.data)


const add = (type, group, join) => {
  if (type === 'include') {
    include.value = ''
    includes.value[group].push({
      edit: true,
      join: join,
      category: "",
      op: "",
      field: "",
      options: [],
      val: ""
    })
  } else {
    exclude.value = ''
    excludes.value[group].push({
      edit: true,
      join: join,
      category: "",
      op: "",
      field: "",
      options: [],
      val: ""
    })
  }
}

const addGroup = (type, join) => {

  if (type === 'include') {
    includeAddGroup.value = ''
    includes.value[Object.keys(includes.value).length + 1] = [{
      edit: true,
      join: join,
      category: "",
      op: "",
      field: "",
      options: [],
      val: ""
    }]
  } else {
    excludeAddGroup.value = ''
    excludes.value[Object.keys(excludes.value).length + 1] = [{
      edit: true,
      join: join,
      category: "",
      op: "",
      field: "",
      options: [],
      val: ""
    }]
  }
}

const include = ref(null)
const exclude = ref(null)


const includeAddGroup = ref(null)
const excludeAddGroup = ref(null)

const resultsBy = ref(null)
const resultsByDetails = ref({NEW: []})

const loading = ref(false)

const results = ref({})
const chart_data = ref(null)
const chart_category = ref(null)
const chart_options = ref([])

const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

const save = (data) => {
  resultsBy.value = data.name
  resultsByDetails.value[data.name] = Object.keys(data.fields)

  
  showSettings.value = false
}

watch([resultsBy, includes, excludes], () => {
  
  if(!resultsBy.value || !includes.value || !excludes.value)
    return

  chart_data.value = null
  loading.value = true

  cohortService.resultsBy({includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  .then(result => {

    results.value = result.data.facetDistribution

    console.log(results.value)

    chart_category.value = Object.keys(results.value)[0]
    chart_options.value = Object.keys(results.value)



    loading.value = false
  })
}, { deep: true })


watch(chart_category, () => {
  let labels = []
  let dataset = {data: []}
  console.log(results.value, chart_category.value)
  for(const key of Object.keys(results.value[chart_category.value])) {
    labels.push(key)
    dataset.data.push(results.value[chart_category.value][key])
  }

  chart_data.value = {
    labels: labels,
    datasets: [dataset]
  }
}, {deep: true})

const cohort_name = ref("")

</script>

<template>
<div class="flex flex-col">
    <div class="flex flex-row mb-4">

      <va-input class="w-2 border-gray-500 border border-solid  w-full rounded" v-model="cohort_name" label="Cohort"  />
    </div>
    <div class=" grid gap-4 grid-cols-3 w-full mb-12">
      <va-card stripe stripe-color="success" >
        <va-card-title>Includes</va-card-title>
        <va-card-content>

          <div v-for="group in Object.keys(includes)" class="border border-white">
            
            <div v-for="(include, index) in includes[group]" class="flex flex-col">
              <va-divider v-if="include.join">
                <span class="px-2" >{{ makeLabel(include.join) }}</span>
              </va-divider>
              <div v-if="index === 0" class="flex flex-col items-center">
                <h1 class="px-2 text-xl mb-2 ">
                  Group {{ group }}
                </h1>
              </div>
              
              <div v-if="include.edit" class="border-gray-500 border border-solid p-4">
                
                <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.category" :options="cohortStore.categories" label="Category" @update:modelValue="getIncludes( group, index, include.category)"  />
                <div v-if="include.category" class="mb-2">
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.field" :options="include.options" label="Field" />
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.op" :options="['contains', '>', '<', '=']" label="Operator" />
                  <va-input class="w-2  w-full rounded" v-model="include.val" label="Value"  />
                  <va-button v-if="include.val" class="w-full " @click="include.edit=false" preset="secondary" border-color="primary" hover-behavior="opacity" :hover-opacity="0.4" >Save</va-button>
                </div>
              </div>

              <div v-else class="flex">
                <va-button class="" @click="include.edit=true" preset="secondary" border-color="primary" hover-behavior="opacity" :hover-opacity="0.4" >
                  <span>{{ include.category }}.{{ include.field }} {{ include.op }} {{ include.val }}</span>
                </va-button>
              </div>

            </div>

            <va-select v-model="include"  class="w-full mt-2" :options="['AND', 'OR']" @update:modelValue="add('include', group, include)" label="Add Criteria" />
            
          </div>

          <va-divider  />

          <va-select v-model="includeAddGroup"  class="w-full mt-2" :options="['AND', 'OR']" @update:modelValue="addGroup('include', includeAddGroup)" label="Add Group" />


          
        </va-card-content>
      </va-card>
      <va-card stripe stripe-color="danger">
        <va-card-title>Excludes</va-card-title>
        <va-card-content>
          <div v-for="group in Object.keys(excludes)" class="border border-white">
            
            <div v-for="(exclude, index) in excludes[group]" class="flex flex-col">
              <va-divider v-if="exclude.join">
                <span class="px-2" >{{ makeLabel(exclude.join) }}</span>
              </va-divider>
              <div v-if="index === 0" class="flex flex-col items-center">
                <h1 class="px-2 text-xl mb-2 ">
                  Group {{ group }}
                </h1>
              </div>
              
              <div v-if="exclude.edit" class="border-gray-500 border border-solid p-4">
                
                <va-select class="w-full border-gray-800 border border-solid rounded" v-model="exclude.category" :options="cohortStore.categories" label="Category" @update:modelValue="getExcludes( group, index, exclude.category)"  />
                <div v-if="exclude.category" class="mb-2">
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="exclude.field" :options="exclude.options" label="Field" />
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="exclude.op" :options="['!=', 'IS EMPTY']" label="Operator" />
                  <va-input class="w-2  w-full rounded" v-model="exclude.val" label="Value"  />
                  <va-button v-if="exclude.val" class="w-full " @click="exclude.edit=false" preset="secondary" border-color="primary" hover-behavior="opacity" :hover-opacity="0.4" >Save</va-button>
                </div>
              </div>

              <div v-else class="flex">
                <va-button class="" @click="exclude.edit=true" preset="secondary" border-color="primary" hover-behavior="opacity" :hover-opacity="0.4" >
                  <span>{{ exclude.category }}.{{ exclude.field }} {{ exclude.op }} {{ exclude.val }}</span>
                </va-button>
              </div>

            </div>

            <va-select v-model="exclude"  class="w-full mt-2" :options="['AND', 'OR']" @update:modelValue="add('exclude', group, exclude)" label="Add Criteria" />
            
          </div>

          <va-divider  />

          <va-select v-model="excludeAddGroup"  class="w-full mt-2" :options="['AND', 'OR']" @update:modelValue="addGroup('exclude', excludeAddGroup)" label="Add Group" />

        </va-card-content>
      </va-card>
      <va-card stripe stripe-color="info">
        <va-card-title>Results By</va-card-title>
        <va-card-content>
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
    <va-button class="" preset="secondary" border-color="primary" @click="save"><Icon icon="material-symbols:save-sharp" /> &nbsp; Save </va-button>
</div>

<va-modal v-model="showSettings"  size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
  <Settings class="w-full h-3/4" @save="save" />
</va-modal>



</template>


<style>


</style>