import api from './api'

class MODELService {
  // CREATE
  addItem = (data) => api.post('/MODEL/', data)
  addItems = (data) => api.post('/MODEL/all', data)

  // READ
  getAll = () => api.get('/MODEL/')
  getOne = (id) => api.get(`/MODEL/${id}`)
  getMine = () => api.get('/MODEL/mine/')

  // UPDATE
  updateItem = (data) => api.put(`/MODEL/${data.id}`, data)
  updateItems = (data) => api.put(`/MODEL/all`, data)

  // DELETE
  removeItem = (data) => api.delete(`/MODEL/${data.id}`)
  removeItems = (data) => api.delete(`/MODEL/all`, data)
}

export default new MODELService()