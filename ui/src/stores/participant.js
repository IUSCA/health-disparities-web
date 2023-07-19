import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import participantService from '../services/participant'

export const useParticipantStore = defineStore('participant', () => {
    const all = ref([])
    const details = ref({})
    const categories = ref([])

    const options = ref({sortBy: 'id', sortingOrder: 'asc', numPerPage: 10, page: 1, search: '', category: 'demographics'})
    const metadata = ref({})
    const status = ref("")

    // CREATE
    const addItem = (item) => participantService.addItem(item)
      .then(() => all.value.push(item))
      .catch((error) => status.value = error)

    const addItems = (items) => participantService.addItem(items)
      .then(() => {
        all.value = all.value.concat(items)
      })
      .catch((error) => status.value = error)

    
    // READ


    const getAll = () => participantService.getAll()
    .then(result => {

      // all.value = result.data.
      details.value = result.data
    })
    .catch((error) => status.value = error)

    const getOne = (id) => participantService.getOne(id)
      .then(result => details.value = result.data)
      .catch((error) => status.value = error)
      // For local only: details.value = all.value.filter(e => e.id === id)[0]


      // For local only: const getMine = () => all.value.filter(e => e.user_id === user.value.id)

    const getCategories = () => participantService.getCategories()
    .then(result => {
      categories.value = result.data
    })
    .catch((error) => status.value = error)

    const getCategory = (category) => participantService.getCategory(category)
    .then(result => {
      details.value.category = result.data
    })
    .catch((error) => status.value = error)


    const getFacets = (data) => participantService.getFacets(data)
    .then(results => {
      details.value.facets = results.data
    })
    .catch((error) => status.value = error)

    // SEARCH
    const searchAll = (params = options.value) => participantService.searchAll(params)
    .then(result => {
      console.log(result.data)
      all.value = result.data.hits
      details.value.count = result.data.estimatedTotalHits
      
    })
    .catch((error) => status.value = error)
    
    const searchTotals = (params = options.value) => participantService.searchTotals(params)
    .then(result => {
      let results = result.data.results.reduce((acc, field) => {
      acc[field.indexUid] = {}
      acc[field.indexUid]['total'] = field.estimatedTotalHits
      acc[field.indexUid]['participant'] = Object.keys(field.facetDistribution.participant_id).length

      
      return acc;
    }, {});

      details.value.total = results

      // details.value.total = result.data
    })
    .catch((error) => status.value = error)

    const updateSearch = ({sortBy = options.value.sortBy, sortingOrder = options.value.sortingOrder, numPerPage = options.value.numPerPage, page = options.value.page, search = options.value.search, category = options.value.category}) => {
    // const updateSearch = ({sortBy, sortingOrder, numPerPage, page, search, category}   = options.value) => {      
      options.value = {sortBy, sortingOrder, numPerPage, page, search, category} 
    }

    const getMetadata = () => participantService.getMetadata()
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

        addItem,
        addItems,

        getAll,
        getOne,


        searchAll,
        updateSearch,
        searchTotals,
        
        getMetadata, 
        getCategories,
        getCategory,
        
        getFacets

    }
})

if (import.meta.hot)
    import.meta.hot.accept(acceptHMRUpdate(useParticipantStore, import.meta.hot))