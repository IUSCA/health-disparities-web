<script setup >

import { useParticipantStore } from "@/stores/participant"

import TableSearch from "@/components/participants/TableSearch.vue"
import Category from "@/components/participants/Category.vue"

const searchFilters = ref([])
const search = ref("");


const route = useRoute();




// Get filters
const participantStore = useParticipantStore()
participantStore.getMetadata()

// Update the search as they type - debounced
debouncedWatch(search, () => { participantStore.updateSearch({ search: search.value }) }, {debounce: 500})


let view = Category
const showTable = ref(false)

onMounted(() => {
  if(route.query.table) {
    toggleView()
  }
})



const toggleView = () => {
  showTable.value = !showTable.value
  view = showTable.value ? TableSearch : Category
}

onMounted(() => {
  if('search' in participantStore.options && participantStore.options.search !== "") {
    search.value = participantStore.options.search
  }
})

const showCohort = ref(false)

</script>

<template>
  <div class="flex mb-10">
    <div class="flex flex-row  px-4 ">

      <div class="w-full  mb-2 mr-4 flex flex-col">
        <div class="flex">  
            <va-input v-model="search"  class="border-gray-500 border border-solid w-full mb-6 rounded" label="Search"  clearable> 
              <template #prependInner> <Icon icon="material-symbols:search" class="text-xl" /> </template> 
            </va-input>
        </div>

        <component :is="view" :key="showTable"  @toggleView="toggleView" />


      </div>
    </div>
  </div>

</template>

<style scoped>



</style>