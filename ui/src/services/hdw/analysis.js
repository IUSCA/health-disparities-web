import api from "@/services/hdw/api";

class AnalysisService {
  logisticAnalysis({ cohort_id, intervention_id }) {
    return api.post(`/analysis/logistic/${cohort_id}/${intervention_id}`);
  }

  getResult(id) {
    return api.get(`/analysis/result/${id}`);
  }

  getResults() {
    return api.get(`/analysis/results`);
  }
}

export default new AnalysisService();
