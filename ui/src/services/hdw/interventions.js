import api from "@/services/hdw/api";

class InterventionService {
  create(data) {
    return api.post("/interventions", data);
  }

  getAll({ search_query, category } = {}) {
    return api.get("/interventions", {
      params: { search_query, category },
    });
  }

  get(id) {
    return api.get(`/interventions/${id}`);
  }
}

export default new InterventionService();
