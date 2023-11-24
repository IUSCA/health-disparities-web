import api from "./api";

class SnapshotService {
  getAll() {
    return api.get(`/snapshots`);
  }

  create(data) {
    return api.post("/snapshots", data);
  }

  update(id, data) {
    return api.patch(`/snapshots/${id}`, data);
  }

  delete(id) {
    return api.delete(`/snapshots/${id}`);
  }
}

export default new SnapshotService();
