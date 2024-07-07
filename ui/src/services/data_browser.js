import api from "./api";
const cache_busting_id = "41e81fd";

class DataBrowserService {
  getGenomicDataCounts() {
    return api.get("/variants/stats/counts", {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  getPhenotypeDataCounts({ category, keyword }) {
    return api.get(`/phenotype/${category}/counts`, {
      params: {
        cache_id: cache_busting_id,
        keyword,
      },
    });
  }

  getParticipantCountsByName({ category, keyword }) {
    return api.get(`/phenotype/${category}/participant-counts-by-name`, {
      params: {
        cache_id: cache_busting_id,
        keyword,
      },
    });
  }

  getParticipantAgeBins({ category, name, num_bins = 10 }) {
    return api.get(`/phenotype/${category}/participants/age/bins`, {
      params: {
        cache_id: cache_busting_id,
        name,
        num_bins,
      },
    });
  }

  getParticipantsPhenotypeAggregate({ category, field, name }) {
    return api.get(`/phenotype/${category}/participants/aggregate`, {
      params: {
        cache_id: cache_busting_id,
        field,
        name,
      },
    });
  }
}

export default new DataBrowserService();
