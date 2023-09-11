<script setup >

import { storeToRefs } from "pinia";
import { useParticipantStore } from "@/stores/participant"
import router from "@/router";
const participantStore = useParticipantStore()


// emit toggle view
const emit = defineEmits(["toggleView"])
const navigateToParticipant = (category) => {
  router.push(`/participants/${category}`) 
}


// Get the initial category totals
if(!('total' in participantStore.details))
  participantStore.searchTotals()

// Get the initial search options
const { options } = storeToRefs(participantStore)


// Watch for changes to the search options
watch(options, () => { 
    participantStore.searchTotals()
 }, { deep: true })


 const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })
 const numFormat = (num) => num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
onMounted(() => {
  if('search' in participantStore.options && participantStore.options.search !== "") {
    search.value = participantStore.options.search
  }
})


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

        <div class="grid grid-rows-4 grid-flow-col gap-4" v-if="'total' in participantStore.details">
          <a @click="navigateToParticipant(category)" class="va-link"  v-for="category of Object.keys(participantStore.details.total)">
            <va-card class="">
              <va-card-content class="bold text-2xl">
                <div class="flex flex-col text-center">
                  <span>{{ makeLabel(category) }}  {{ numFormat(participantStore.details.total[category].total)}}</span> 
                  <span class="text-base">Participants  {{ numFormat(participantStore.details.total[category].participant)}}</span> 
                </div>
              </va-card-content>
            </va-card>
          </a>
        </div>

        <div v-else class="mx-auto">
          <va-progress-circle indeterminate />
        </div>


      </div>
    </div>
  </div>

</template>

<style scoped>



</style>