<script setup>

import { useParticipantStore } from "@/stores/participant"
import { useRouter } from "vue-router"
const router = useRouter()

const participantStore = useParticipantStore()

const props = defineProps({ participantId: String });

onMounted(() => {
  participantStore.getOne(parseInt(props.participantId))
})



const dataTable = computed(() => {
  if(activeTab.value in participantStore.details && participantStore.details[activeTab.value].length > 0) {
    return participantStore.details[activeTab.value]
  } else {
    return []
  }
})



// Setup columns so datatable can be dynamic
const columns = computed (() => {
  let cols = []

  if(activeTab.value in participantStore.details && participantStore.details[activeTab.value].length > 0) {
    for(const key of Object.keys(participantStore.details[activeTab.value][0])) {
      cols.push({ 
        key: key, 
        sortable: true, 
        sortingOptions: ["desc", "asc", null], 
      })
    }
  } 

  return cols
})

const activeTab = ref('labs')
const goBack = () => router.push('/participants?table=true')

const tabs = computed(() => {
  let t = []
  if(Object.keys(participantStore.details).length > 0) {
    for(let tab of Object.keys(participantStore.details)) {
      if(typeof participantStore.details[tab] === "object" && tab !== "demographics")
        t.push({ label: makeLabel(tab), value: tab })
    }
  }
  return t
})

const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

const details = computed(() => {
  if('demographics' in participantStore.details) {
    return participantStore.details.demographics[0]
  } else {
    return {}
  }
})

const calculateAge = (dateString) => {
  // Get the current date
  let currentDate = new Date();
  
  // Convert the provided date string to a Date object
  let birthDate = new Date(dateString);
  
  // Calculate the age
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  
  // Check if the birthday hasn't occurred yet this year
  if (currentDate.getMonth() < birthDate.getMonth() || 
      (currentDate.getMonth() === birthDate.getMonth() && 
       currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

const calculateYearsSince = (dateString) => {
  const currentDate = new Date();
  const inputDate = new Date(dateString);

  const yearsDiff = currentDate.getFullYear() - inputDate.getFullYear();

  // Check if the current month and day are before the input date's month and day
  if (
    currentDate.getMonth() < inputDate.getMonth() ||
    (currentDate.getMonth() === inputDate.getMonth() &&
      currentDate.getDate() < inputDate.getDate())
  ) {
    // If so, subtract 1 from the difference in years
    return yearsDiff - 1;
  }

  return yearsDiff;
}


const calcDetails = (label, detail) => {

  if(label === 'dob') {
    return "Age: " + calculateAge(detail)
  } else if(label === 'enroll_date') {
    return "Enrolled: " + calculateYearsSince(detail) + " Years"
  } else {
    return `${makeLabel(label)}: ` + detail
  }

}


</script>

<template>

<va-button class="flex flex-row mb-2" preset="secondary" border-color="primary" @click="goBack()"><Icon icon="ri:arrow-go-back-fill" /> &nbsp; Search</va-button>
<va-card class="mb-2">
    <va-card-title class=""><span class="text-xl mx-auto">Participant</span></va-card-title>
    <va-card-content>
      <div class="grid grid-rows-3 grid-flow-col gap-4 ">
          <div  v-for="detail in Object.keys(details)">
            {{ calcDetails(detail, details[detail]) }}
          </div>
      </div>
    </va-card-content>
</va-card>


<va-card>
  <va-card-content>
    <div>
      <va-button-toggle class="mx-auto mb-2" v-model="activeTab" :options="tabs" preset="secondary" border-color="primary" />
    </div>

    <div>
        <va-data-table :items="dataTable" :columns="columns" v-model:sort-by="sortBy" v-model:sorting-order="sortingOrder"  :filter="search"  />
    </div>
  </va-card-content>
</va-card>  


</template>