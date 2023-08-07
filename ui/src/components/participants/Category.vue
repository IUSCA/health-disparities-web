<script setup >
import { storeToRefs } from "pinia";
import { useParticipantStore } from "@/stores/participant"
const participantStore = useParticipantStore()
const summaryNumbers = ref({})

// emit toggle view
const emit = defineEmits(["toggleView"])
const toggleView = (category) => {
  participantStore.updateSearch({ category: category })
  emit('toggleView')
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
</script>

<template>


      
  <div class="grid grid-rows-4 grid-flow-col gap-4" v-if="'total' in participantStore.details">
    <a @click="toggleView(category)" class="va-link"  v-for="category of Object.keys(participantStore.details.total)">
      <va-card class="">
        <va-card-content class="bold text-2xl">
          <div class="flex flex-col text-center">
            <span>{{ makeLabel(category) }}  {{ numFormat(participantStore.details.total[category])}}</span> 
            <!-- <span class="text-base">Participants  {{ numFormat(participantStore.details.total[category].participant)}}</span>  -->
          </div>
        </va-card-content>
      </va-card>
    </a>
  </div>

  <div v-else class="mx-auto">
    <va-progress-circle indeterminate />
  </div>

      
</template>