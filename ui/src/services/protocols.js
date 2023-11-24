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
    return api.patch(`/protocols/${id}`, data);
  }

  delete(id) {
    return api.delete(`/protocols/${id}`);
  }
}

export default new ProtocolService();
