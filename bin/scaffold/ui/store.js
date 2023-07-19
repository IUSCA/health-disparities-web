import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import MODELService from '../services/MODEL'

export const useMODELStore = defineStore('MODEL', () => {
    const all = ref([])
    const details = ref({})
    const status = ref("")

    // CREATE
    const addItem = (item) => MODELService.addItem(item)
      .then(() => all.value.push(item))
      .catch((error) => status.value = error)

    const addItems = (items) => MODELService.addItem(items)
      .then(() => {
        all.value = all.value.concat(items)
      })
      .catch((error) => status.value = error)

    // READ
    const getAll = () => MODELService.getAll()
      .then(result => all.value = result.data)
      .catch((error) => status.value = error)

    const getOne = (id) => MODELService.getOne(id)
      .then(result => details.value = result.data)
      .catch((error) => status.value = error)
      // For local only: details.value = all.value.filter(e => e.id === id)[0]

    const getMine = () => MODELService.getMine()
      .then(result => all.value = result.data)
      .catch((error) => status.value = error)
      // For local only: const getMine = () => all.value.filter(e => e.user_id === user.value.id)

    // UPDATE
    const updateItem = (item) => MODELService.updateItem(item)
      .then(() => {
        const index = all.value.findIndex(e => e.id === item.id)
        all.value[index] = item
        details.value = item
      })
      .catch((error) => status.value = error)

    const updateItems = (items) => MODELService.updateItems(items)
      .then(() => {
        for(let item of items) {
          const index = all.value.findIndex(e => e.id === item.id)
          all.value[index] = item
          details.value = item
        }
      })
      .catch((error) => status.value = error)


    // DELETE
    const removeItem = (item) => MODELService.removeItem(item)
      .then(() => {all.value = all.value.filter(i => i.id !== item)})
      .catch((error) => status.value = error)

    const removeItems = (items) => MODELService.removeItems(items)
      .then(() => {
        for(let item of items) 
          all.value = all.value.filter(i => i.id !== item)
      })
      .catch((error) => status.value = error)

    const clear = () => all.value = []

    // CHECK IF EXISTS
    const hasItem = (item) => (all.value.filter(e =>  e.id === item.id).length > 0)
    const hasItems = (items) => {
      for(let item of items) {
          if(! hasItem(item)) return false
      }
      return true
    }


    return {
        all,
        details,
        status,

        addItem,
        addItems,

        getAll,
        getOne,
        getMine,

        updateItem,
        updateItems,

        removeItem,
        removeItems,

        hasItem,
        hasItems,
        
        clear,
    }
})

if (import.meta.hot)
    import.meta.hot.accept(acceptHMRUpdate(useMODELStore, import.meta.hot))