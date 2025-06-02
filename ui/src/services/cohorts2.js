import { getURL } from "@/services/utils";
import api from "./api";

class CohortService {
  getById(id) {
    return api.get(`/cohorts2/${id}`);
  }

  search({
    search_term,
    type,
    visibility,
    archived,
    derivable,
    sort_by,
    sort_order,
    limit,
    offset,
  }) {
    return api.get("/cohorts2", {
      params: {
        search_term,
        ...(type !== "" && { type }),
        visibility,
        archived,
        derivable,
        sort_by,
        sort_order,
        limit,
        offset,
      },
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

  getCohortURL(params, relative = true) {
    return getURL("/cohorts/builder", params, relative);
  }
}

export default new CohortService();
