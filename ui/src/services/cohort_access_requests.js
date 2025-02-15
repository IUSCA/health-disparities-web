import api from "./api";

class CohortAccessRequests {
  getAll(params) {
    return api.get("/cohort_access_requests", {
      params,
    });
  }

  getById(id) {
    return api.get(`/cohort_access_requests/${id}`);
  }

  create(data) {
    return api.post("/cohort_access_requests", data);
  }

  update(id, data) {
    return api.patch(`/cohort_access_requests/${id}`, data);
  }

  delete(id) {
    return api.delete(`/cohort_access_requests/${id}`);
  }
}

export default new CohortAccessRequests();
