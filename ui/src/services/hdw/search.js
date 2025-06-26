import api from "@/services/api";

class SearchService {
  subjects(body) {
    return api.post(`/hdw/search/subjects`, body);
  }

  dx(name) {
    return api.get(`/hdw/search/dx`, {
      params: {
        name: name,
      },
    });
  }

  procedures(name) {
    return api.get(`/hdw/search/procedures`, {
      params: {
        name: name,
      },
    });
  }
}

export default new SearchService();
