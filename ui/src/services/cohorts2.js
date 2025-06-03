import { getURL } from "@/services/utils";
import api from "./api";

class CohortService {
  getById(id) {
    return api.get(`/cohorts2/${id}`);
  }

  search(params) {
    return api.get("/cohorts2", {
      params,
    });
  }

  create(data) {
    return api.post("/cohorts2", data);
  }

  update(id, data) {
    return api.patch(`/cohorts2/${id}`, data);
  }

  updateVisibility(id, visibility) {
    return api.patch(`/cohorts2/${id}/visibility`, { visibility });
  }

  archive(id) {
    return api.post(`/cohorts2/${id}/actions/archive`);
  }

  unarchive(id) {
    return api.post(`/cohorts2/${id}/actions/unarchive`);
  }

  searchParticipants({ query, search_id = null }) {
    return api.post(
      "/cohorts2/participants/search",
      {
        query,
      },
      {
        params: {
          search_id,
        },
      },
    );
  }

  delete({ id, delete_dependents }) {
    return api.delete(`/cohorts2/${id}`, {
      params: {
        delete_dependents,
      },
    });
  }

  getDependents(id) {
    return api.get(`/cohorts2/${id}/dependents`);
  }

  getFilesSummary(id) {
    return api.get(`/cohorts2/${id}/files/summary`);
  }

  getCohortURL(params, relative = true) {
    return getURL("/cohorts/builder", params, relative);
  }

  favorite(id) {
    return api.put(`/cohorts2/favorites/${id}`);
  }

  unfavorite(id) {
    return api.delete(`/cohorts2/favorites/${id}`);
  }
}

export default new CohortService();
