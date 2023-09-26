<script setup>
import { Bar } from 'vue-chartjs'
import { storeToRefs } from "pinia";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

import { useParticipantStore } from "@/stores/participant"
import participantService from '@/services/participant'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const participantStore = useParticipantStore()
const params = defineProps(['category', 'search'])

const { options, details } = storeToRefs(participantStore)

const loading = ref(false)
loading.value = true
const chart_category = ref(null)
const chart_data = ref(null)
const chart_options = ref([])


onMounted(() => {
  participantService.getFacetOptions({table: params.category}).then(result => {
    chart_options.value = result.data
    chart_category.value = result.data[0]
  })
})


watch(options, () => {
  if('facets' in participantStore.details) {
    let labels = []
    let dataset = {data: []}

    participantStore.getFacets({table: params.category, chart_category: chart_category.value, search: params.search})
    .then(() => { 

      for(const key of Object.keys(participantStore.details.facets[chart_category.value])) {
        labels.push(key)
        dataset.data.push(participantStore.details.facets[chart_category.value][key])
      }

      chart_data.value = {
        labels: labels,
        datasets: [dataset]
      }
    
      console.log(chart_data.value)

      loading.value = false
    })


  }
}, {deep: true})







watch([chart_category], () => {
  loading.value = true
  let labels = []
  let dataset = {data: []}
  participantStore.getFacets({table: params.category, chart_category: chart_category.value, search: params.search})
    .then(() => { 

      for(const key of Object.keys(participantStore.details.facets[chart_category.value])) {
        labels.push(key)
        dataset.data.push(participantStore.details.facets[chart_category.value][key])
      }

      chart_data.value = {
        labels: labels,
        datasets: [dataset]
      }
    
      console.log(chart_data.value)

      loading.value = false
    })
}, {deep: true})

</script>

<template>


    <div v-if="! loading" class="h-2/4 w-full items-center flex flex-col border border-black border-solid">
      <div>
      <h1 class="text-2xl">{{ params.category }}</h1>
      </div>
      <va-button-toggle class="mx-auto" v-model="chart_category" :options="chart_options" preset="secondary" border-color="primary" />

      <Bar  id="my-chart-id" :key="chart_data" :options="{ responsive: true, indexAxis: 'y', plugins: {legend: {display: false}}, backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(255, 159, 64, 0.2)',
        'rgba(255, 205, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(201, 203, 207, 0.2)'
      ],
      borderColor: [
        'rgb(255, 99, 132)',
        'rgb(255, 159, 64)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(54, 162, 235)',
        'rgb(153, 102, 255)',
        'rgb(201, 203, 207)'
      ],
      borderWidth: 1}" :data="chart_data" />
    </div>
    <div v-else class=" w-full"><va-progress-circle indeterminate class="mx-auto" /></div>

</template>