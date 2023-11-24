import api from "./api";

class VariantService {
  search({ chromosome, start, end = null }) {
    return api.get(`/variants/${chromosome}`, {
      params: {
        start,
        end: end || start,
      },
    });
  }

  getAnnotations({ query, offset = 0, limit = 50, sortOptions = null }) {
    return api.get(`/variants/annotations`, {
      params: {
        ...query,
        offset,
        limit,
        sortOptions,
      },
    });
  }

  getAnnotationFilters({ query }) {
    return api.get(`/variants/annotations/filters`, {
      params: query,
    });
  }
}

export default new VariantService();
