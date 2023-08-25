import api from './api'

class cohortService {
  // CREATE
  addItem = (data) => api.post('/cohort/', data)
  addItems = (data) => api.post('/cohort/all', data)

  // READ
  getAll = (data) => api.post(`/cohort/search`, data)
  getOne = (id) => api.get(`/cohort/${id}`)


  getCategories = () => api.get(`/cohort/categories`)
  getFields = (data) => api.get(`/cohort/fields/${data}`)

  getFieldsMetadata = (data) => api.get(`/cohort/fields/metadata/${data}`)

  // SEARCH
  searchAll = (data) => api.post(`/cohort/search/all`, data)
  searchTotals = (data) => api.post(`/cohort/search/totals`, data)
  getMetadata = () => api.get(`/cohort/metadata`)

  resultsBy = (data) => api.post(`/cohort/meilisearch/resultsBy`, data)
  saveSetting = (data) => api.post(`/cohort/saveSetting`, data)
  getResultsBy = () => api.get(`/cohort/resultsBy`)
  getResultsByTest = (data) => api.post(`/cohort/test/resultsBy`, data)
  saveCohort = (data) => api.post(`/cohort/saveCohort`, data)
  getValues = (data) => api.post(`/cohort/values`, data)

  getParticipants = (data) => api.post(`/cohort/participants`, data)

  saveGroup = (data) => api.post(`/cohort/saveGroup`, data)
  getGroups = () => api.get(`/cohort/groups`)

  getMyCohorts = () => api.get(`/cohort/mine`)
}

export default new cohortService()