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


const includes =  ref({
  1: [{
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
})

const excludes = ref({
  1: [{
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
})



const getFields = (type, group, index, data) => {

  cohortService.getFields(data).then(result => {
    console.log(result, type, group, index, data)
    if(type === 'include') {
      includes.value[group][index].field = ""
      includes.value[group][index].op = ""
      includes.value[group][index].val = ""
      includes.value[group][index].values = []
      includes.value[group][index].options = Object.keys(result.data)
      includes.value[group][index].operators = result.data
    }

    if(type === 'exclude') {
      excludes.value[group][index].field = ""
      excludes.value[group][index].op = ""
      excludes.value[group][index].val = ""
      excludes.value[group][index].values = []
      excludes.value[group][index].options = Object.keys(result.data)
      excludes.value[group][index].operators = result.data
    }
  })
}

const getInitialValues = (type, group, index, category, field, search) => {
  console.log(type, group, index, category, field, search)
  if(type === 'include') {
    includes.value[group][index].op = ""
    includes.value[group][index].val = ""
  }

  if(type === 'exclude') {
    excludes.value[group][index].op = ""
    excludes.value[group][index].val = ""
  }

  getValues(type, group, index, category, field, search)
}

const getValues = (type, group, index, category, field, search) => cohortService.getValues({category: category, field: field, search: search}).then(result => {
  if(type === 'include')
    includes.value[group][index].values = result.data

  if(type === 'exclude')
    excludes.value[group][index].values = result.data
})


const add = (type, group, join) => {
  if (type === 'include') {
    include.value = ''
    includes.value[group].push({
      edit: true,
      join: join,
      category: "",
      op: "",
operators: [],
      field: "",
      options: [],
      val: "",
values: []
    })
  } else {
    exclude.value = ''
    excludes.value[group].push({
      edit: true,
      join: join,
      category: "",
      op: "",
operators: [],
      field: "",
      options: [],
      val: "",
values: []
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
operators: [],
      field: "",
      options: [],
      val: "",
values: []
    }]
  } else {
    excludeAddGroup.value = ''
    excludes.value[Object.keys(excludes.value).length + 1] = [{
      edit: true,
      join: join,
      category: "",
      op: "",
operators: [],
      field: "",
      options: [],
      val: "",
values: []
    }]
  }
}

const include = ref(null)
const exclude = ref(null)


const includeAddGroup = ref(null)
const excludeAddGroup = ref(null)

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



const loading = ref(false)

const results = ref({})
const chart_data = ref(null)
const chart_category = ref(null)
const chart_options = ref([])

const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })




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
  
  if(checkValues(includes.value)) {
    participants.value = 'loading'  
    getParticipants()
  }

  if(!resultsBy.value)
    return


  chart_category.value = null
  chart_data.value = null
  loading.value = true

  cohortService.resultsBy({includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  .then(result => {

    console.log(result)

    results.value = result.data.facetDistribution

    console.log(`category ${Object.keys(results.value)[0]}`)

    chart_category.value = Object.keys(results.value)[0]
    chart_options.value = Object.keys(results.value)

    

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

const cohort_name = ref("")
const cohort_options = ref([])

const addNewOption = (newOption) => {
      const option = {
        id: String(cohort_options.value.length),
        text: newOption,
        value: newOption,
      };
      cohort_options.value = [...cohort_options.value, option];
}


const toast = useToastStore();

const saveCohort = async () => {
  if(!cohort_name.value || !checkValues(includes.value) ) {
    
    toast.error("Please fill all the fields")
    return
  }

  await cohortService.saveCohort({cohort_name: cohort_name, includes: includes.value, excludes: excludes.value, resultsBy: resultsByDetails.value[resultsBy.value]})
  toast.success("Cohort Saved")
}

const updateVal = (search) => {
  console.log(search)
  if(selectedValue.value !== null) {
    if(selectedValue.value.type === 'include')
      includes.value[selectedValue.value.group][selectedValue.value.index].values = []

    if(selectedValue.value.type === 'exclude')
      excludes.value[selectedValue.value.group][selectedValue.value.index].values = []

    getValues(selectedValue.value.type, selectedValue.value.group, selectedValue.value.index, selectedValue.value.category, selectedValue.value.field, search)

  }
  
}

const selectedValue = ref(null)
const changeSelected = (type, group, index, category, field, search) => selectedValue.value = {type: type, group: group, index: index, category: category, field: field, search: ''}


const showRemove = ref(false)
const removeVal = ref(null)

// Ask user if they really wanted to remove
const removeDialog = (type, group, index) => {
  removeVal.value = {type: type, group: group, index: index}
  showRemove.value = true
}

// Actually remove
const remove = () => {
  showRemove.value = false
  if(removeVal.value.type === 'include') {
    includes.value[removeVal.value.group].splice(removeVal.value.index, 1)
  } else {
    excludes.value[removeVal.value.group].splice(removeVal.value.index, 1)
  }
}

const participants = ref(0)
const getParticipants = () => cohortService.getParticipants({includes: includes.value, excludes: excludes.value}).then(result => participants.value = result.data)

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
                
                <!-- Category -->
                <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.category" :options="cohortStore.categories" label="Category" @update:modelValue="getFields('include', group, index, include.category)"  />

                <div v-if="include.category" class="mb-2">
                  <!-- Fields -->
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.field" :options="include.options" label="Field" 
                  @update:modelValue="getInitialValues('include', group, index, include.category, include.field, include.val)" />

                  <!-- Operator -->
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.op" :options="include.operators[include.field]" label="Operator" />
                  
                  <!-- Values -->
                  <va-input v-if="include.field in include.operators && include.operators[include.field].length > 1" class="w-2 border-gray-500 border border-solid w-full rounded" v-model="include.val" label="Value" />
                  <va-select v-if="include.field in include.operators && ! (include.operators[include.field].length > 1)"  class="w-2 border-gray-500 border border-solid w-full rounded" v-model="include.val" label="Value" :options="include.values"  searchable highlight-matched-text @updateSearch="updateVal" @focus="changeSelected('include', group, index, include.category, include.field, include.val)" :loading="Array.isArray(include.values) && include.values.length === 0" />


                  <!-- Actions -->
                  <div class="flex mt-2">
                    <va-button  class="m-2 " @click="removeDialog('include', group, index)" color="danger" border-color="danger" hover-behavior="opacity" :hover-opacity="0.4" ><Icon icon="typcn:delete-outline" /></va-button>
                    <va-button v-if="include.val" class="m-2 " @click="include.edit=false" color="success" border-color="success" hover-behavior="opacity" :hover-opacity="0.4" ><Icon icon="material-symbols:save-sharp" /></va-button>
                  </div>

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
        <va-card-title><h1 class="text-xl  mx-auto">Excludes</h1></va-card-title>
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
                
                <!-- Category -->
                <va-select class="w-full border-gray-800 border border-solid rounded" v-model="exclude.category" :options="cohortStore.categories" label="Category" @update:modelValue="getFields('exclude', group, index, exclude.category)"  />
                <div v-if="exclude.category" class="mb-2">
                  <!-- Fields -->
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="exclude.field" :options="exclude.options" label="Field" 
                  @update:modelValue="getInitialValues('exclude', group, index, exclude.category, exclude.field, exclude.val)" />
                  
                  <!-- Operator -->
                  <va-select class="w-full border-gray-800 border border-solid rounded" v-model="exclude.op" :options="exclude.operators[exclude.field]" label="Operator" />
                  
                  <!-- Values -->
                  <va-input v-if="exclude.field in exclude.operators && exclude.operators[exclude.field].length > 1" class="w-2 border-gray-500 border border-solid w-full rounded" v-model="exclude.val" label="Value" />
                  <va-select v-if="exclude.field in exclude.operators && ! (exclude.operators[exclude.field].length > 1)"  class="w-2 border-gray-500 border border-solid w-full rounded" v-model="exclude.val" label="Value" :options="exclude.values"  searchable highlight-matched-text @updateSearch="updateVal" @focus="changeSelected('exclude', group, index, exclude.category, exclude.field, exclude.val)" :loading="Array.isArray(exclude.values) && exclude.values.length === 0" />

                  <!-- Actions -->
                  <div class="flex mt-2">
                    <va-button  class="m-2 " @click="removeDialog('exclude', group, index)" color="danger" border-color="danger" hover-behavior="opacity" :hover-opacity="0.4" ><Icon icon="typcn:delete-outline" /></va-button>
                    <va-button v-if="exclude.val" class="m-2 " @click="exclude.edit=false" color="success" border-color="success" hover-behavior="opacity" :hover-opacity="0.4" ><Icon icon="material-symbols:save-sharp" /></va-button>
                  </div>

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
        <va-card-title><h1 class="text-xl  mx-auto">Preview</h1></va-card-title>
        <va-card-content>
          <div class="flex flex-col items-center">
            <div class="text-xl mb-2">Participants: &nbsp; <span v-if="participants != 'loading'">{{ participants }}</span><span v-else-if="participants == 'loading'">
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

<va-modal v-model="showRemove"  size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
  <p>Delete query?</p>
  <br />
  <va-button @click="remove()" class="mx-2" color="danger" border-color="danger" >Delete</va-button>
</va-modal>


</template>


<style>


</style>