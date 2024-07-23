import api from "./api";

class GenAIService {
  generate_name_description({ filters }) {
    return api.post("/gen-ai/generate/name-description", {
      filters,
    });
  }

  generate_cohort({ text }) {
    return api.post("/gen-ai/generate/cohort", {
      text,
    });
  }
}

export default new GenAIService();
