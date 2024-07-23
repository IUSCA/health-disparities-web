import api from "./api";
class GenotypesService {
  getAnnotationsUniqueValues(field, { source_id, snapshot_id, ranges }) {
    return api.post(`/genotypes/annotations/${field}/unique`, {
      source_id,
      snapshot_id,
      ranges,
    });
  }

  getAnnotationsHistogram(field, { source_id, snapshot_id, ranges, bins }) {
    return api.post(`/genotypes/annotations/${field}/histogram`, {
      source_id,
      snapshot_id,
      ranges,
      bins,
    });
  }

  getTotalCount({ source_id, snapshot_id, ranges }) {
    return api.post(`/genotypes/annotations/total-count`, {
      source_id,
      snapshot_id,
      ranges,
    });
  }

  search(data) {
    return api.post(`/genotypes/search`, data);
  }
}

export default new GenotypesService();
