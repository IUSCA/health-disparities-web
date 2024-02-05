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

  getParticipantCount({ variant_ids, source_id, snapshot_id }) {
    return api.post(`/variants/participant-count`, {
      variant_ids,
      source_id,
      snapshot_id,
    });
  }
}

export default new VariantService();
