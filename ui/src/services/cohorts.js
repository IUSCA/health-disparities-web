import api from "./api";

class CohortService {
  getById(id) {
    return api.get(`/cohorts/${id}`);
  }

  search({
    search_term,
    is_published,
    is_locked,
    is_mine,
    type,
    sort_by,
    sort_order,
    limit,
    offset,
  }) {
    return api.get("/cohorts", {
      params: {
        search_term,
        ...(is_published !== "" && { is_published }),
        ...(is_locked !== "" && { is_locked }),
        ...(is_mine !== "" && { is_mine }),
        ...(type !== "" && { type }),
        sort_by,
        sort_order,
        limit,
        offset,
      },
    });
  }

  create(data) {
    return api.post("/cohorts", data);
  }

  update(id, data) {
    return api.patch(`/cohorts/${id}`, data);
  }

  searchParticipants({ query, search_id = null }) {
    return api.post(
      "/cohorts/search-participants",
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
    return api.delete(`/cohorts/${id}`, {
      params: {
        delete_dependents,
      },
    });
  }

  isDeletable(id) {
    return api.get(`/cohorts/${id}/is-deletable`);
  }
}

export default new CohortService();
