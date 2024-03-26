import api from "./api";

class SourceService {
  getAll() {
    return api.get(`/sources`);
  }

  create(data) {
    return api.post("/sources", data);
  }

  update(id, data) {
    return api.patch(`/sources/${id}`, data);
  }

  delete(id) {
    return api.delete(`/sources/${id}`);
  }
}

export default new SourceService();
