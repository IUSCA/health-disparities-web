import config from "@/config";
import api from "./api";

const cache_busting_id = config.phenotype_data.cache_busting_id;

class ParticipantService {
  getTotalCount() {
    return api.get("/participants/total-count", {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  getByCohortId({ cohort_id, limit = null, offset = null }) {
    return api.get(`/participants`, {
      params: {
        cohort_id,
        limit,
        offset,
      },
    });
  }

  details({ participant_id }) {
    return api.get(`/participants/${participant_id}`, {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  aggregate({ cohort_id, field }) {
    return api.get(`/participants/aggregate`, {
      params: {
        cohort_id,
        field,
      },
    });
  }

  bins({ cohort_id, field, bins }) {
    return api.get(`/participants/bins`, {
      params: {
        cohort_id,
        field,
        bins,
      },
    });
  }

  ageBins(cohort_id) {
    return api.get(`/participants/age/bins`, {
      params: {
        cohort_id,
      },
    });
  }

  dateBins({ cohort_id, field, bins }) {
    return api.get(`/participants/date/bins`, {
      params: {
        cohort_id,
        field,
        bins,
      },
    });
  }

  getAll = ({ currentPage, itemsPerPage, sortBy, sortingOrder }) =>
    api.post("/participants/all", {
      currentPage,
      itemsPerPage,
      sortBy,
      sortingOrder,
    });
  getDetails = (id) => api.get(`/participants/${id}/details`);
  getCategoryDetails = ({ id, category, view, dateRange }) =>
    api.post(`/participants/${id}/${category}/${view}`, { dateRange });
}
export default new ParticipantService();
