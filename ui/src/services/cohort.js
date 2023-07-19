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

  // SEARCH
  searchAll = (data) => api.post(`/cohort/search/all`, data)
  searchTotals = (data) => api.post(`/cohort/search/totals`, data)
  getMetadata = () => api.get(`/cohort/metadata`)

  resultsBy = (data) => api.post(`/cohort/resultsBy`, data)
}

export default new cohortService()