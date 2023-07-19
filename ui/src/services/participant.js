import api from './api'

class participantService {
  // CREATE
  addItem = (data) => api.post('/participant/', data)
  addItems = (data) => api.post('/participant/all', data)

  // READ
  getAll = (data) => api.post(`/participant/search`, data)
  getOne = (id) => api.get(`/participant/${id}`)


  getCategories = () => api.get(`/participant/categories`)
  getCategory = (data) => api.get(`/participant/categories/${data}`)

  // SEARCH
  searchAll = (data) => api.post(`/participant/search/all`, data)
  searchTotals = (data) => api.post(`/participant/search/totals`, data)
  getMetadata = () => api.get(`/participant/metadata`)

  getFacets = (data) => api.post(`/participant/search/facets`, data)
  getFacetOptions = (data) => api.post(`/participant/search/facetOptions`, data)


}

export default new participantService()