import api from "./api";

class VariantService {
  search({ query, offset = 0, limit = 50 }) {
    return api.post(`/variants`, {
      ...query,
      offset,
      limit,
    });
  }

  search2({ query, offset = 0, limit = 50 }) {
    return api.post(`/variants/new`, {
      ...query,
      offset,
      limit,
    });
  }

  getFilters({ query }) {
    return api.post(`/variants/filters`, query);
  }
}

export default new VariantService();
