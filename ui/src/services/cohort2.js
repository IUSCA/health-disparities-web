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
        id: cache_busting_id,
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

  // searchParticipantsWithSetOperations(cohort_ids, operators) {
  //   return api.post("/cohorts/search/set_operations", {
  //     set_operations: {
  //       cohort_ids,
  //       operators,
  //     },
  //   });
  // }
}

export default new cohortService();
