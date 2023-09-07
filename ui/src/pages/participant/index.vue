<script setup >
import participantService from "@/services/participant"
import cohortService from "@/services/cohort"



onMounted(() => {

  loading.value = true

  participantService.searchAll(options.value).then(results => {
    loading.value = false

    participants.value = results.data.hits
    count.value = results.data.estimatedTotalHits
  })

  cohortService.getResultsBy().then(results => {
    for(let data of results.data) {
      resultsByDetails.value[data.name] = data.fields
    }
  })
  
})

const categories = ref([])
const showSettings = ref(false)

// Sort and pagination
const participants = ref([])
const count = ref(0)
const options = ref({
  category: "participants",
  search: "",
  sortBy: "demographics.gender",
  fields: resultsBy.value,
  sortingOrder: "asc",
  page: 1,
  numPerPage: 10
})




const loading = ref(false)

const pageOptions = [10, 25, 50, 100]
const pages = computed(() =>  Math.floor(count.value / options.value.numPerPage))


// Setup columns so datatable can be dynamic
const columns = computed (() => {
  var cols = []

  if(participants.value.length > 0)
    for(const key of Object.keys(participants.value[0])) {
      cols.push({ 
        key: key, 
        sortable: true, 
        sortingOptions: ["desc", "asc", null], 
      })
    }
    cols.push({ key: "actions", label: "Actions" })
  return cols
})

const getFields = (val) => cohortService.getFieldsMetadata(val) .then(result => fields.value = result.data)

const resultsBy = ref(null)
const resultsByDetails = ref({})

const save = (data) => {
  resultsByDetails.value[data.name] = data.fields
  resultsBy.value = data.name
  showSettings.value = false
}

const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

</script>

<template>
<div class="w-full flex flex-row">
  <div class="w-5/6  mb-2 mr-4 flex flex-col">
      <div class="flex">  
          <va-input v-model="search"  class="border-gray-500 border border-solid w-full mb-6 rounded" label="Search"  clearable> 
            <template #prependInner> <Icon icon="material-symbols:search" class="text-xl" /> </template> 
          </va-input>
      </div>

      <va-data-table :items="participants" :columns="columns" v-model:sort-by="sortBy" v-model:sorting-order="sortingOrder"  :filter="search"  >

        <template #cell(actions)="{ rowData }">
          <va-button preset="secondary" border-color="primary"   @click="patientDetails(rowData.participant_id)" class="va-button"><Icon icon="clarity:details-line" />&nbsp; Participant</va-button>
        </template>
      </va-data-table>
      <div class="mt-2 flex flex-row content-end">
        <va-select class="w-2 border-gray-800 border border-solid w-full  rounded" v-model="numPerPage" :options="pageOptions" label="Number Per Page" />
        <b class="pt-2 ml-2">Total: {{ count }}</b>
        <va-pagination v-model="options.page" input :pages="pages" />
      </div>
  </div>


  <div class="w-1/3">
    <div class="flex">
      <va-select class="w-full border-gray-800 border border-solid rounded" v-model="resultsBy" :options="Object.keys(resultsByDetails)" />
      <va-button class="flex flex-row   ml-2 pl-2" preset="secondary" border-color="primary" @click="showSettings = !showSettings"><Icon icon="mdi:cog" /> &nbsp; </va-button>
    </div>
    <va-accordion v-model="value" class="max-w-sm">
    <va-collapse v-for="(field, index) in categories" :key="index" :header="getHeader(field)" @click="getFields(field)">
      <div v-if="fields" class="mt-3">
        <va-switch @click.stop class="mr-2" v-model="chosen_fields[`${field}.${option}`]" v-for="option in fields">{{ option }}</va-switch>
      </div>
      <div v-else>
        <va-loading />
      </div>
      <br />
    </va-collapse>
  </va-accordion>
  </div>

</div>


<va-modal v-model="showSettings"  size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
  <Settings class="w-full h-3/4" @save="save" />
</va-modal>

</template>