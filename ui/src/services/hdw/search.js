import api from "@/services/hdw/api";

class SearchService {
  subjects(body) {
    return api.post(`/search/subjects`, body);
  }

  dx(name) {
    return api.get(`/search/dx`, {
      params: {
        name: name,
      },
    });
  }

  procedures(name) {
    return api.get(`/search/procedures`, {
      params: {
        name: name,
      },
    });
  }
}

export default new SearchService();
