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

  searchParticipants(query) {
    return api.post("/cohorts/search", {
      query,
    });
  }
}

export default new cohortService();
