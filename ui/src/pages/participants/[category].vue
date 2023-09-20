<script setup >
import participantService from "@/services/participant"
import cohortService from "@/services/cohort"
import router from "@/router";
const cat = defineProps({ category: String });

onMounted(() => {

  searchParticipants()


  participantService.getCategories().then(results => {
    for (let result of results.data) {
      categories.value = results.data

      category_options.value.push({
        id: String(category_options.value.length ? category_options.value.length : 0),
        text: makeLabel(result),
        value: result,
      })
    }
    category.value = category_options.value.filter(i => i.value === cat.category)[0]
  })

  // Populate Groups
  cohortService.getGroups().then(results => {
    for(let data of results.data) {
      addNewGroup(data.name, data.id, data.query)
    }
  })
  
})

const group_options = ref([])

const addNewGroup = (newOption, id = null, query = null) => {
  
  const option = {
        id: id ? id : String(group_options.value.length),
        text: newOption,
        value: query ? query : newOption,
      };
      group_options.value = [...group_options.value, option];
}

const searchParticipants = () => {
  loading.value = true


  participantService.searchParticipants(options.value).then(results => {
    console.log(results)
    loading.value = false

    participants.value = results.data.hits
    count.value = results.data.count
    participant_count.value = results.data.participant_count

  })
}

const participant_count = ref(0)

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
const pageOptions = [1, 5, 10, 25, 50, 100]
const pages = computed(() => Math.floor(participant_count.value / options.value.numPerPage))

// Search Options
const options = ref({
  category: cat.category,
  search: "",
  sortBy: "id",
  sortingOrder: "asc",
  page: 1,
  numPerPage: 10,

  filters: [{
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

// Loading boolean
const loading = ref(false)




// Setup columns so datatable can be dynamic
const columns = computed(() => {
  var cols = []

  if (participants.value.length > 0)
    for (const key of Object.keys(participants.value[0])) {
      cols.push({
        key: key,
        sortable: true,
        sortingOptions: ["desc", "asc", null],
      })
    }
  cols.push({ key: "actions", label: "Actions" })
  return cols
})

// Sort and pagination
watchDebounced(() => options.value.search, () => {
  console.log('searching...')
  searchParticipants()
}, { deep: true, debounce: 500  })

watch(() => [options.value.sortBy, options.value.sortingOrder, options.value.numPerPage, options.value.page], () => {
  console.log('sorting...')
  searchParticipants()
}, { deep: true  })


const updateCategory = (cat) => {
  console.log(cat)
  options.value.category = cat
  options.value.page = 1
  options.value.sortBy = "id"
  router.replace({ path: `/participants/${cat}` })
  searchParticipants()
}


// FILTERS
const criteria = ref(null)

const getFields = (index, cat) => {
  cohortService.getFields(cat).then(result => {
    options.value.filters[index].field = ""
    options.value.filters[index].op = ""
    options.value.filters[index].val = ""
    options.value.filters[index].values = []
    options.value.filters[index].options = Object.keys(result.data)
    options.value.filters[index].operators = result.data
  })
}

const add = (join) => {
  options.value.filters.push({
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

  criteria.value = ''
}

const selectedValue = ref(null)
const changeSelected = (index, category, field, search) => {
  selectedValue.value = { index: index, category: category, field: field, search: '' }
}


const getInitialValues = (index, category, field, search) => {
  options.value.filters[index].op = ""
  options.value.filters[index].val = ""

  getValues(index, category, field, search)
}

const getValues = (index, category, field, search) => cohortService.getValues({ category: category, field: field, search: search }).then(result => {
  options.value.filters[index].values = result.data

})

const save = (index) => {
  options.value.filters[index].edit = false
  searchParticipants()
}

const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

const current_fields = ref([])
const group = ref(null)

  
const groupChanged = ref(false)
const changeValue = () => {
  groupChanged.value = true
}

const saveGroup = async (option) => {
  if(option.value != option.text) {
    await cohortService.saveGroup({id: option.id, name: option.text, query: options.value})
    groupChanged.value = false
  } else {
    cohortService.saveGroup({name: option.text, query: options.value}).then(result => {
      options.value = options.value.filter(i => i.name !== option.text)
      addNewGroup(result.data.name, result.data.id, result.data.query)
      groupChanged.value = false
    })
  }
}

</script>

<template>
  <div class="w-full flex flex-row">
    <div class="w-4/6  mb-2 mr-4 flex flex-col">
      <div class="flex">
        <va-input v-model="options.search"  class="border-gray-500 border border-solid w-full mb-6 rounded" label="Search"  clearable> 
            <template #prependInner> <Icon icon="material-symbols:search" class="text-xl" /> </template> 
          </va-input>
      </div>

      <va-data-table style=" height: calc(100vh - 13.75rem)" :items="participants" :columns="columns" v-model:sort-by="options.sortBy" v-model:sorting-order="options.sortingOrder" virtual-scroller sticky-header>
        <template #cell(actions)="{ rowData }">
          <va-button preset="secondary" border-color="primary" @click="patientDetails(rowData.participant_id)"
            class="va-button">
            <Icon icon="clarity:details-line" />&nbsp; Participant
          </va-button>
        </template>
      </va-data-table>
      <div class="mt-2 flex flex-row content-end">
        <va-select class="w-2 border-gray-800 border border-solid w-full  rounded" v-model="options.numPerPage"
          :options="pageOptions" label="Participant Per Page" />
        <b class="pt-2 ml-2">Total: {{ count }}</b>
        <va-pagination v-model="options.page" input :pages="pages" />
      </div>
    </div>


    <div class="w-1/6">
      <div class="flex mb-4"><va-chip outline > Participants: {{ participant_count }} </va-chip></div>
      <div class="flex">
        <va-select class="w-2 border-gray-800 border border-solid w-full  rounded" v-model="category"
          :options="categories" label="Category" @update:modelValue="updateCategory(category)" />
      </div>
      <div>
        <h1 class="text-xl text-center my-2">Filters</h1>
        <va-select class="mb-2 border-gray-500 border border-solid w-full rounded" v-model="group" label="Group" :options="group_options" searchable highlight-matched-text allow-create="unique" @create-new="addNewGroup" @update:modelValue="showGroup(group)"  />
        <div v-for="(include, index) in options.filters" class="flex flex-col">
          <va-divider v-if="include.join">
            <span class="px-2">{{ makeLabel(include.join) }}</span>
          </va-divider>


          <div v-if="include.edit" class="border-gray-500 border border-solid p-4">
            <!-- Category -->
            <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.category"
              :options="categories" label="Category" @update:modelValue="getFields(index, include.category)" />

            <div v-if="include.category" class="mb-2">
              <!-- Fields -->
              <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.field"
                :options="include.options" label="Field"
                @update:modelValue="getInitialValues(index, include.category, include.field, include.val)" />

              <!-- Operator -->
              <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.op"
                :options="include.operators[include.field]" label="Operator" />

              <!-- Values -->
              <va-input v-if="include.field in include.operators && include.operators[include.field].length > 1"
                class="w-2 border-gray-500 border border-solid w-full rounded" v-model="include.val" label="Value" />
              <va-select v-if="include.field in include.operators && !(include.operators[include.field].length > 1)"
                class="w-2 border-gray-500 border border-solid w-full rounded" v-model="include.val" label="Value"
                :options="include.values" searchable highlight-matched-text @updateSearch="updateVal"
                @focus="changeSelected(index, include.category, include.field, include.val)"
                :loading="Array.isArray(include.values) && include.values.length === 0"
                @update:modelValue="changeValue()" />

              <!-- Actions -->
              <div class="flex mt-2">
                <va-button class="m-2 " @click="removeDialog(index)" color="danger" border-color="danger"
                  hover-behavior="opacity" :hover-opacity="0.4">
                  <Icon icon="typcn:delete-outline" />
                </va-button>
                <va-button v-if="include.val" class="m-2 " @click="save(index)" color="success"
                  border-color="success" hover-behavior="opacity" :hover-opacity="0.4">
                  <Icon icon="material-symbols:save-sharp" />
                </va-button>
              </div>

            </div>
          </div>

          <div v-else class="flex">
            <va-button class="" @click="include.edit=true" preset="secondary" border-color="primary"
              hover-behavior="opacity" :hover-opacity="0.4">
            <span>{{ include.category }}.{{ include.field }} {{ include.op }} {{ include.val }}</span>
          </va-button>
        </div>
      </div>


      <va-select v-model="criteria" class="w-full mt-4" :options="['AND', 'OR']" @update:modelValue="add(criteria)"
        label="Add Criteria" />

      <va-button v-if="isNaN(group) && groupChanged" class="w-full mt-2" @click="saveGroup(group)" preset="primary" border-color="primary" hover-behavior="opacity" :hover-opacity="0.4" >
        <Icon icon="material-symbols:save-sharp" />Save Group
      </va-button>
    </div>
  </div>
</div>




<va-modal v-model="showSettings" size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
  <Settings class="w-full h-3/4" @save="save" />
</va-modal></template>