import config from "@/config";
import api from "./api";
const cache_busting_id = "41e81fd";

class cohortService {
  unique(category, field) {
    return api.get(`/cohorts/${category}/${field}/unique`, {
      params: {
        id: cache_busting_id,
      },
    });
  }

  search(name, mine) {
    return api.get("/cohorts", {
      params: {
        name,
        mine,
      },
    });
  }

  create(data) {
    return api.post("/cohorts", data);
  }
  update(id, data) {
    return api.patch(`/cohorts/${id}`, data);
  }

  get(id) {
    return api.get(`/cohorts/${id}`);
  }

  getTotalParticipants() {
    return api.get("/cohorts/participants/total", {
      params: {
        id: cache_busting_id,
      },
    });
  }

  searchParticipants(query, set_operations = null) {
    return api.post("/cohorts/search", {
      query: {
        ...config.cohort.phenotype_schema,
        query,
        ...(set_operations != null && { set_operations }),
      },
    });
  }

  searchParticipantsWithSetOperations(cohort_ids, operators) {
    return api.post("/cohorts/search/set_operations", {
      set_operations: {
        cohort_ids,
        operators,
      },
    });
  }
}

export default new cohortService();
