import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import cohortService from '../services/cohort'

export const useCohortStore = defineStore('cohort', () => {
    const all = ref([])
    const details = ref({})
    const options = ref({
      sortBy: 'id', sortingOrder: 'asc', numPerPage: 10, page: 1, search: '', category: 'demographics',
    })


    const categories = ref([])
    const metadata = ref({})

    const status = ref("")

    const getFields = (category) => {
      options.value.fields.options =  null
      cohortService.getFields(category).then(result => { 
        options.value.fields.options = result.data
      })
    }





    const getCategories = (category) => cohortService.getCategories(category)
    .then(result => {
      categories.value = result.data
    })
    .catch((error) => status.value = error)



    const getMetadata = () => cohortService.getMetadata()
    .then(result => {
      metadata.value = result.data
     })
    .catch((error) => status.value = error)



    return {
        all,
        details,

        options,
        categories,
        metadata,
        status,

        
        getMetadata, 
        getFields,
        getCategories,


    }
})

if (import.meta.hot)
    import.meta.hot.accept(acceptHMRUpdate(useCohortStore, import.meta.hot))