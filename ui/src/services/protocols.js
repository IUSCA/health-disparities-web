import api from "./api";

class ProtocolService {
  getAll() {
    return api.get(`/protocols`);
  }

  get(id) {
    return api.get(`/protocols/${id}`);
  }

  create(data) {
    return api.post("/protocols", data);
  }

  update(id, data) {
    return api.put(`/protocols/${id}`, data);
  }

  delete(id) {
    return api.delete(`/protocols/${id}`);
  }

  addUsers(id, user_ids) {
    return api.post(`/protocols/${id}/users`, { user_ids });
  }

  removeUser(id, user_id) {
    return api.delete(`/protocols/${id}/users/${user_id}`);
  }
}

export default new ProtocolService();
