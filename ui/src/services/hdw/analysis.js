import api from "@/services/api";

class AnalysisService {
  logisticAnalysis({ cohort_id, intervention_id }) {
    return api.post(`/hdw/analysis/logistic/${cohort_id}/${intervention_id}`);
  }

  getResult(id) {
    return api.get(`/hdw/analysis/result/${id}`);
  }

  getResults() {
    return api.get(`/hdw/analysis/results`);
  }
}

export default new AnalysisService();
