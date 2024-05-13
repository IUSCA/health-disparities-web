import api from "./api";

class GenAIService {
  generate_name_description({ criteria }) {
    return api.post("/gen-ai/generate/name-description", {
      criteria,
    });
  }

  generate_cohort({ text }) {
    return api.post("/gen-ai/generate/cohort", {
      text,
    });
  }
}

export default new GenAIService();
