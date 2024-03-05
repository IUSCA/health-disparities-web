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

  createCohort({
    variant_ids,
    source_id,
    snapshot_id,
    name,
    description = null,
    is_published = null,
    is_locked = null,
  } = {}) {
    return api.post(`/variants/cohorts`, {
      variant_ids,
      source_id,
      snapshot_id,
      name,
      description,
      is_published,
      is_locked,
    });
  }

  updateCohort(cohort_id, {
    variant_ids,
    source_id,
    snapshot_id,
    name,
    description = null,
    is_published = null,
    is_locked = null,
  } = {}) {
    return api.put(`/variants/cohorts/${cohort_id}`, {
      variant_ids,
      source_id,
      snapshot_id,
      name,
      description,
      is_published,
      is_locked,
    });
  }
}

export default new VariantService();
