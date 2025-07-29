import api from "@/services/hdw/api";

class CohortService {
  create(data) {
    return api.post("/cohorts/", data);
  }

  getAll({ sort_by, sort_order, search_query } = {}) {
    return api.get("/cohorts/", {
      params: { sort_by, sort_order, search_query },
    });
  }

  get(id) {
    return api.get(`/cohorts/${id}`);
  }

  getSummary(id) {
    return api.get(`/cohorts/${id}/summary`);
  }

  getEncounterPercentiles(id) {
    return api.get(`/cohorts/${id}/encounter_percentiles`);
  }

  getEncounterBins(id) {
    return api.get(`/cohorts/${id}/encounter_bins`);
  }
}

export default new CohortService();
