import api from "@/services/hdw/api";

class InterventionService {
  create(data) {
    return api.post("/interventions/", data);
  }

  getAll({ search_query, category, sort_by, sort_order } = {}) {
    return api.get("/interventions/", {
      params: { search_query, category, sort_by, sort_order },
    });
  }

  get(id) {
    return api.get(`/interventions/${id}`);
  }
}

export default new InterventionService();
