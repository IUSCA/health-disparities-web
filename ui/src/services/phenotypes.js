import config from "@/config";
import api from "./api";

const cache_busting_id = config.phenotype_data.cache_busting_id;

class PhenotypesService {
  unique(category, field) {
    return api.get(`/phenotypes/${category}/${field}/unique`, {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  textFieldAutoComplete(category, field, text, limit = 100, offset = 0) {
    return api.get(`/phenotypes/${category}/${field}/startswith/${text}`, {
      params: {
        limit,
        offset,
      },
    });
  }

  dxNameAutoComplete(text, limit = 100, offset = 0) {
    return api.get("/phenotypes/dxname", {
      params: {
        text,
        limit,
        offset,
      },
    });
  }
}

export default new PhenotypesService();
