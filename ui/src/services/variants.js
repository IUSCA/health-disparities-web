import api from "./api";
class VariantService {
  search(data) {
    return api.post(`/variants/search`, data);
  }

  search2(data) {
    return api.post(`/variants/search2`, data);
  }

  createCohort(data) {
    return api.post(`/variants/cohort`, data);
  }

  updateCohort(id, data) {
    return api.patch(`/variants/cohort/${id}`, data);
  }
}

export default new VariantService();
