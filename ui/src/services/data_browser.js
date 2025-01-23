import config from "@/config";
import api from "./api";

const cache_busting_id = config.phenotype_data.cache_busting_id;

class DataBrowserService {
  getGenomicDataCounts() {
    return api.get("/genotypes/stats/counts", {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  getAnnotationCounts({ source }) {
    return api.get(`/genotypes/stats/${source}/count`, {
      params: {
        cache_id: cache_busting_id,
      },
    });
  }

  getPhenotypeDataCounts({ category, keyword }) {
    return api.get(`/phenotypes/${category}/counts`, {
      params: {
        cache_id: cache_busting_id,
        keyword,
      },
    });
  }

  getParticipantCountsByName({ category, keyword, offset, limit }) {
    return api.get(`/phenotypes/${category}/participant-counts-by-name`, {
      params: {
        cache_id: cache_busting_id,
        keyword,
        offset,
        limit,
      },
    });
  }

  getParticipantAgeBins({ category, name, num_bins = 10 }) {
    return api.get(`/phenotypes/${category}/participants/age/bins`, {
      params: {
        cache_id: cache_busting_id,
        name,
        num_bins,
      },
    });
  }

  getParticipantAggregate({ category, field, name }) {
    return api.get(`/phenotypes/${category}/participants/aggregate`, {
      params: {
        cache_id: cache_busting_id,
        field,
        name,
      },
    });
  }
}

export default new DataBrowserService();
