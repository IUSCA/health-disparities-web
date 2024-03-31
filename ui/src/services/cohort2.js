import api from "./api";
const cache_busting_id = "41e81fd";

class cohortService {
  unique(category, field) {
    return api.get(`/cohorts/${category}/${field}/unique`, {
      params: {
        cache_id: cache_busting_id,
      },
    });
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

  textFieldAutoComplete(category, field, text, limit = 100, offset = 0) {
    return api.get(`/cohorts/${category}/${field}/startswith/${text}`, {
      params: {
        limit,
        offset,
      },
    });
  }

  dxNameAutoComplete(text, limit = 100, offset = 0) {
    return api.get("/cohorts/dxname", {
      params: {
        text,
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

  get(id) {
    return api.get(`/cohorts/${id}`);
  }

  getTotalParticipants() {
    return api.get("/cohorts/participants/total", {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  getParticipants({ id, limit = null, offset = null }) {
    return api.get(`/cohorts/${id}/participants`, {
      params: {
        limit,
        offset,
      },
    });
  }

  getParticipantDetails({ participant_id }) {
    return api.get(`/cohorts/participants/${participant_id}`, {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  searchParticipants({
    schema,
    criteria,
    save_results = false,
    search_id = null,
  }) {
    return api.post(
      "/cohorts/search",
      {
        query: {
          ...schema,
          criteria,
        },
      },
      {
        params: {
          save_results,
          search_id,
        },
      },
    );
  }
}

export default new cohortService();
