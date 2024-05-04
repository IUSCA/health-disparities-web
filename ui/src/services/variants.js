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

  search({
    source_id,
    snapshot_id,
    ranges,
    query,
    zygosities,
    offset = 0,
    limit = 50,
  }) {
    return api.post(`/variants/search`, {
      source_id,
      snapshot_id,
      ranges,
      query,
      zygosities: zygosities || ["HET", "HETFLP", "HOMALT"],
      offset,
      limit,
    });
  }
}

export default new VariantService();
