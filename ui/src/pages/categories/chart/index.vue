<script setup>
import ParticipantChart from "@/components/participants/ParticipantChart.vue";
import router from "@/router";
import participantService from '@/services/participant'
import { useNavStore } from "@/stores/nav";
const nav = useNavStore();
nav.setNavItems([
  {
    label: `Categories Chart`,
  },
]);

const search = ref(null)
const display = ref('Chart')
const categories = ref(null)
const display_options = ref([
  { label: 'Data', value: 'Data' },
  { label: 'Chart', value: 'Chart' },
])

onMounted(() => {
  participantService.getCategories().then(result => {
    categories.value = result.data
  })
})


watch(() => display.value, () => {
  if(display.value === 'Data') {
    router.push(`/categories/data`)
  }
})


const demographic = ref('demographic')

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


        <div class="grid grid-rows-4 grid-flow-col gap-4" >
          <va-card class="" v-for="category in categories">
            <va-card-content class="bold text-2xl w-1/2">
              <ParticipantChart  :category="category" :search="search" />
            </va-card-content>
          </va-card>
        </div>




      </div>
    </div>
  </div>

</template>