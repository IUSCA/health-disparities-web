import api from "./api";
class VariantService {
  getAnnotationsUniqueValues(field, { source_id, snapshot_id, ranges }) {
    return api.post(`/variants/annotations/${field}/unique`, {
      source_id,
      snapshot_id,
      ranges,
    });
  }

  getAnnotationsHistogram(field, { source_id, snapshot_id, ranges, bins }) {
    return api.post(`/variants/annotations/${field}/histogram`, {
      source_id,
      snapshot_id,
      ranges,
      bins,
    });
  }

  getTotalCount({ source_id, snapshot_id, ranges }) {
    return api.post(`/variants/total-count`, {
      source_id,
      snapshot_id,
      ranges,
    });
  }

  search(data) {
    return api.post(`/variants/search`, data);
  }

  createCohort(data) {
    return api.post(`/variants/cohort`, data);
  }

  updateCohort(id, data) {
    return api.patch(`/variants/cohort/${id}`, data);
  }
}

export default new VariantService();
