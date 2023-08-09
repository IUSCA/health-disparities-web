<script setup >
import { storeToRefs } from "pinia";
import { useParticipantStore } from "@/stores/participant"
import { useRouter } from "vue-router"



const router = useRouter()
const route = useRoute();

onMounted(() => {
  if(route.query.table) 
    display.value = "Table"


    loading.value = true

    participantStore.searchAll().then(() => loading.value = false)
  
})


const emit = defineEmits(["toggleView"])

const toggleView = () => {
  router.replace({'query': null});
  emit('toggleView')
}

const participantStore = useParticipantStore()





// Sort and pagination
const sortBy = ref("name")
const sortingOrder = ref("asc")
const currentPage = ref(1)
const numPerPage = ref(10)

const loading = ref(false)

const pageOptions = [10, 25, 50, 100]
const pages = computed(() =>  Math.floor(participantStore.details.count / numPerPage.value))


// Setup columns so datatable can be dynamic
const columns = computed (() => {
  var cols = []

  if(participantStore.all.length > 0)
    for(const key of Object.keys(participantStore.all[0])) {
      cols.push({ 
        key: key, 
        sortable: true, 
        sortingOptions: ["desc", "asc", null], 
      })
    }
    cols.push({ key: "actions", label: "Actions" })
  return cols
})

// Get the initial search options
const { options, details } = storeToRefs(participantStore)

// Watch for changes to the search options
watch([options], () => { 
  loading.value = true
  participantStore.searchAll().then(() => loading.value = false) 
}, { deep: true })

// Watch for sorting and pagination changes
watch([sortBy, sortingOrder, currentPage, numPerPage], () => {
  participantStore.updateSearch({sortBy: sortBy.value, sortingOrder: sortingOrder.value, page: currentPage.value, numPerPage: numPerPage.value})
})


const patientDetails = (id) => router.push(`/participants/${id}`)


const display = ref('Chart')
const display_options = ref([
  { label: 'Chart', value: 'Chart' },
  { label: 'Table', value: 'Table' },
])





const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

</script>

<template>
<div class="w-full">
  
  <table class="w-full" border="1">
    <tr class="leading-none">
      <td class="w-1/3"> <va-button class="mb-2 " preset="secondary" border-color="primary" @click="toggleView()"><Icon icon="ri:arrow-go-back-fill" /> &nbsp; Categories</va-button> </td>

      <td class="text-center w-1/3 "> <h1 class="text-3xl">{{ makeLabel(participantStore.options?.category) }}</h1> </td>

      <td class="text-right w-1/3">
        <va-button-toggle class="ml-auto" v-model="display" :options="display_options" preset="secondary" border-color="primary" />
      </td>
    </tr>
  </table>

  <div v-if="display === 'Chart'" class="w-full">
    <ParticipantChart />
  </div>

  <div v-if="display === 'Table'">
    <va-data-table :items="participantStore.all" :columns="columns" v-model:sort-by="sortBy" v-model:sorting-order="sortingOrder"  :filter="search"  >
      <template #cell(actions)="{ rowData }">
        <va-button preset="secondary" border-color="primary"   @click="patientDetails(rowData.id)" class="va-button"><Icon icon="clarity:details-line" />&nbsp; Participant</va-button>
      </template>
    </va-data-table>
    <div class="mt-2 flex flex-row content-end">
      <va-select class="w-2 border-gray-800 border border-solid w-full  rounded" v-model="numPerPage" :options="pageOptions" label="Number Per Page" />
      <b class="pt-2 ml-2">Total: {{ participantStore.details.count }}</b>
      <va-pagination v-model="currentPage" input :pages="pages" />
    </div>
  </div>
</div>
</template>