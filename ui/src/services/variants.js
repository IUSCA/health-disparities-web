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
}

export default new VariantService();
