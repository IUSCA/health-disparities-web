import api from "./api";

class OllamaService {
  generate_name_description({ criteria }) {
    return api.post("/ollama/generate/name-description", {
      criteria,
    });
  }
}

export default new OllamaService();
