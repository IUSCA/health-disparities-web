<script setup >
import participantService from "@/services/participant"
import router from "@/router";
const cat = defineProps({ category: String });

onMounted(() => {

  searchParticipants()


  participantService.getCategories().then(results => {
    for(let result of results.data) {
      categories.value = results.data

      category_options.value.push({
        id: String(category_options.value.length ? category_options.value.length : 0),
        text: makeLabel(result),
        value: result,
      })
    }
    category.value = category_options.value.filter(i => i.value === cat.category)[0]
  })

})

const searchParticipants = () => {
  loading.value = true
  participantService.searchParticipants(options.value).then(results => {
    console.log(results)
    loading.value = false

    participants.value = results.data.hits
    count.value = results.data.estimatedTotalHits
  })
}


// Category display
const category = ref(null)
const category_options = ref([])

// Filter display
const categories = ref([])
const filter = ref(null)
const chosen_fields = ref({})


// Sort and pagination
const participants = ref([])
const count = ref(0)
const pageOptions = [10, 25, 50, 100]
const pages = computed(() =>  Math.floor(count.value / options.value.numPerPage))

// Search Options
const options = ref({
  category: cat.category,
  search: "",
  sortBy: "id",
  sortingOrder: "asc",
  page: 1,
  numPerPage: 10
})

// Loading boolean
const loading = ref(false)




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


const updateCategory = (category) => {
  console.log(category)
  options.value.category = category.value
  options.value.page = 1
  router.replace({ path: `/participants/${category.value}` })
  searchParticipants()
}


const getHeader = (field) => makeLabel(field) + " - " +  Object.keys(chosen_fields.value).filter(key => key.startsWith(field)).length
const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })


</script>

<template>
<div class="w-full flex flex-row">
  <div class="w-4/6  mb-2 mr-4 flex flex-col">
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


  <div class="w-1/6">
    <div class="flex">
      <va-select class="w-2 border-gray-800 border border-solid w-full  rounded" v-model="category" :options="category_options" label="Category" @update:modelValue="updateCategory(category)" />
    </div>
    <div>
    <h1 class="text-xl text-center my-2">Filters</h1>
    <va-accordion v-model="filter" class="w-full">
      <va-collapse v-for="(field, index) in categories" :key="index" :header="getHeader(field)" @click="getFields(field)">
        <div v-if="fields" class="mt-3">
          
        </div>
        <div v-else>
          <va-loading />
        </div>
        <br />
      </va-collapse>
    </va-accordion>
    </div>
  </div>

</div>


<va-modal v-model="showSettings"  size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
  <Settings class="w-full h-3/4" @save="save" />
</va-modal>

</template>