import api from "@/services/api";

class InterventionService {
  create(data) {
    return api.post("/hdw/interventions", data);
  }

  getAll({ search_query, category } = {}) {
    return api.get("/hdw/interventions", {
      params: { search_query, category },
    });
  }

  get(id) {
    return api.get(`/hdw/interventions/${id}`);
  }
}

export default new InterventionService();
