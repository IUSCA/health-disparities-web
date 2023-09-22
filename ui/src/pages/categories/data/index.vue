<script setup>
import { useParticipantStore } from "@/stores/participant"
import router from "@/router";
import { useNavStore } from "@/stores/nav";
const nav = useNavStore();
nav.setNavItems([
  {
    label: `Categories Data`,
  },
]);


const participantStore = useParticipantStore()


const search = ref(null)
const display = ref('Data')
const display_options = ref([
  { label: 'Data', value: 'Data' },
  { label: 'Chart', value: 'Chart' },
])


onMounted(() => {
  if('search' in participantStore.options && participantStore.options.search !== "") {
    search.value = participantStore.options.search
  }

  if(!('total' in participantStore.details))
    participantStore.searchTotals()
})


// Watch for changes to the search options
watch(search, () => { 
    participantStore.searchTotals()
 }, { deep: true })


watch(() => display.value, () => {
  if(display.value === 'Chart') {
    router.push(`/categories/chart`)
  }
})

const navigateToParticipant = (category) => { router.push(`/participants/${category}`) }
const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })
const numFormat = (num) => num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")


</script>

<template>
  <div class="flex mb-10">
    <div class="flex flex-row  px-4 ">

      <div class="w-full  mb-2 mr-4 flex flex-col">
        <div class="flex">  
            <va-input v-model="search"  class=" w-full mb-4 rounded" label="Search"  clearable> 
              <template #prependInner> <Icon icon="material-symbols:search" class="text-xl" /> </template> 
            </va-input>
        </div>
        <va-button-toggle class="mx-auto mb-4" v-model="display" :options="display_options" preset="secondary" border-color="primary" />

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
