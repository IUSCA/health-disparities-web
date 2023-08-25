<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { useCohortStore } from "@/stores/cohort"
import cohortService from '@/services/cohort'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const cohortStore = useCohortStore()
cohortStore.getCategories()

const params = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const getFields = (group, index, cat) => {
  cohortService.getFields(cat).then(result => {
      params.modelValue[group]['query'][index].field = ""
      params.modelValue[group]['query'][index].op = ""
      params.modelValue[group]['query'][index].val = ""
      params.modelValue[group]['query'][index].values = []
      params.modelValue[group]['query'][index].options = Object.keys(result.data)
      params.modelValue[group]['query'][index].operators = result.data

      emit('update:modelValue', params.modelValue)
    }
  )
}

const getInitialValues = ( group, index, category, field, search) => {
  console.log( group, index, category, field, search)
    params.modelValue[group]['query'][index].op = ""
    params.modelValue[group]['query'][index].val = ""
  
    emit('update:modelValue', params.modelValue)

  getValues( group, index, category, field, search)
}

const getValues = ( group, index, category, field, search) => cohortService.getValues({category: category, field: field, search: search}).then(result => {
  params.modelValue[group]['query'][index].values = result.data

  emit('update:modelValue', params.modelValue)
})


const criteria = ref('')

const add = ( group, join) => {
    params.modelValue[group]['query'].push({
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

    emit('update:modelValue', params.modelValue)

}

const addGroup = (join) => {
    includeAddGroup.value = ''
    params.modelValue.push({group: params.modelValue.length + 1, query: [{
      edit: true,
      join: join,
      category: "",
      op: "",
      operators: [],
      field: "",
      options: [],
      val: "",
      values: []
    }]})

  emit('update:modelValue', params.modelValue)
} 
  
const includeAddGroup = ref(null)
const resultsByDetails = ref({NEW: []})

onMounted(async () => {

  // Populate Results By
  cohortService.getResultsBy().then(results => {
    for(let data of results.data) {
      resultsByDetails.value[data.name] = data.fields
    }
  })

  // Populate Groups
  cohortService.getGroups().then(results => {
    for(let data of results.data) {
      addNewGroup(data.name, data.id, data.query)
    }
  })

})

const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })


const updateVal = (search) => {
  console.log(search)
  if(selectedValue.value !== null) {
      params.modelValue[selectedValue.value.group][selectedValue.value.index].values = []

    getValues(selectedValue.value.type, selectedValue.value.group, selectedValue.value.index, selectedValue.value.category, selectedValue.value.field, search)

  }
  
}

const changeValue = () => {
  groupChanged.value = true
}

const selectedValue = ref(null)
const changeSelected = ( group, index, category, field, search) => {
  selectedValue.value = { group: group, index: index, category: category, field: field, search: ''}
}

const showRemove = ref(false)
const removeVal = ref(null)

// Ask user if they really wanted to remove
const removeDialog = ( group, index) => {
  removeVal.value = { group: group, index: index}
  showRemove.value = true
}

// Actually remove
const remove = () => {
  showRemove.value = false
  console.log("Removing", removeVal.value)
  params.modelValue[removeVal.value.group]['query'].splice(removeVal.value.index, 1)

}

const group_options = ref([])

const addNewGroup = (newOption, id = null, query = null) => {
  
  const option = {
        id: id ? id : String(group_options.value.length),
        text: newOption,
        value: query ? query : newOption,
      };
      group_options.value = [...group_options.value, option];
}


const saveGroup = async (option, group) => {


  console.log(option, group)
  if(option.value != option.text) {
    await cohortService.saveGroup({id: option.id, name: option.text, query: params.modelValue[group]['query']})
    groupChanged.value = false
  } else {
    cohortService.saveGroup({name: option.text, query: params.modelValue[group]['query']}).then(result => {
      group_options.value = group_options.value.filter(i => i.name !== option.text)
      addNewGroup(result.data.name, result.data.id, result.data.query)
      groupChanged.value = false
    })
  }
}

const showGroup = (option, group) => {
  groupChanged.value = true
  if(option.value != option.text) {
    
    params.modelValue[group]['query'] = option.value
    emit('update:modelValue', params.modelValue)
    groupChanged.value = false
  }
}

const groupChanged = ref(false)


</script>

<template>

<div v-for="(grouping, group) in modelValue" class="border border-white">
  
  <div v-for="(include, index) in grouping.query"  class="flex flex-col">
    <va-divider v-if="include.join">
      <span class="px-2" >{{ makeLabel(include.join) }}</span>
    </va-divider>
    <div v-if="grouping.group && index === 0" class="flex flex-col items-center">

        <va-select class="mb-2 border-gray-500 border border-solid w-full rounded" v-model="grouping.group" label="Group" :options="group_options" searchable highlight-matched-text allow-create="unique" @create-new="addNewGroup" @update:modelValue="showGroup(grouping.group, group)"  />

    </div>
    
    <div v-if="include.edit" class="border-gray-500 border border-solid p-4">
      
      <!-- Category -->
      <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.category" :options="cohortStore.categories" label="Category" @update:modelValue="getFields(group, index, include.category)"  />

      <div v-if="include.category" class="mb-2">
        <!-- Fields -->
        <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.field" :options="include.options" label="Field" 
        @update:modelValue="getInitialValues( group, index, include.category, include.field, include.val)" />

        <!-- Operator -->
        <va-select class="w-full border-gray-800 border border-solid rounded" v-model="include.op" :options="include.operators[include.field]" label="Operator" />
        
        <!-- Values -->
        <va-input v-if="include.field in include.operators && include.operators[include.field].length > 1" class="w-2 border-gray-500 border border-solid w-full rounded" v-model="include.val" label="Value" />
        <va-select v-if="include.field in include.operators && ! (include.operators[include.field].length > 1)"  class="w-2 border-gray-500 border border-solid w-full rounded" v-model="include.val" label="Value" :options="include.values"  searchable highlight-matched-text @updateSearch="updateVal" @focus="changeSelected( group, index, include.category, include.field, include.val)" :loading="Array.isArray(include.values) && include.values.length === 0" @update:modelValue="changeValue()" />


        <!-- Actions -->
        <div class="flex mt-2">
          <va-button  class="m-2 " @click="removeDialog(group, index)" color="danger" border-color="danger" hover-behavior="opacity" :hover-opacity="0.4" ><Icon icon="typcn:delete-outline" /></va-button>
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


    <va-button v-if="isNaN(grouping.group) && groupChanged" class="w-full mt-2" @click="saveGroup(grouping.group, group)" preset="primary" border-color="primary" hover-behavior="opacity" :hover-opacity="0.4" >
      <Icon icon="material-symbols:save-sharp" />Save Group
    </va-button>

  <va-select v-model="criteria"  class="w-full mt-2" :options="['AND', 'OR']" @update:modelValue="add(group, criteria)" label="Add Criteria" />
  
</div>
<va-divider  />

<va-select v-model="includeAddGroup"  class="w-full mt-2" :options="['AND', 'OR']" @update:modelValue="addGroup( includeAddGroup)" label="Add Group" />




<va-modal v-model="showRemove"  size="large" blur maxWidth="100%" maxHeight="100%" hide-default-actions>
  <p>Delete query?</p>
  <br />
  <va-button @click="remove()" class="mx-2" color="danger" border-color="danger" >Delete</va-button>
</va-modal>


</template>


<style>


</style>