import api from "./api";

class cohortService {
  unique(category, field) {
    return api.get(`/cohorts/${category}/${field}/unique`, {
      params: {
        id: "41e81fd",
      },
    });
  }
}

export default new cohortService();
