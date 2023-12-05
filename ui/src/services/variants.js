import api from "./api";

class VariantService {
  search({ query, offset = 0, limit = 50 }) {
    return api.get(`/variants`, {
      params: {
        ...query,
        offset,
        limit,
      },
    });
  }

  getFilters({ query }) {
    return api.get(`/variants/filters`, {
      params: query,
    });
  }
}

export default new VariantService();
