import api from "./api";
class ICD10Service {
  searchTree({ keyword }) {
    return api.get(`/icd10/search/tree`, {
      params: { keyword },
    });
  }

  searchTree2({ keyword }) {
    return api.get(`/icd10/search/tree2`, {
      params: { keyword },
    });
  }

  searchTree2Elasticsearch({ keyword }) {
    return api.get(`/icd10/search/tree2/elasticsearch`, {
      params: { keyword },
    });
  }

  searchSynonyms({ keyword }) {
    return api.get(`/icd10/synonyms`, {
      params: { keyword },
    });
  }

  getDescendants({ code }) {
    return api.get(`/icd10/descendants/${code}`);
  }

  typeahead(starts_with) {
    return api.get(`/icd10/typeahead`, {
      params: { starts_with },
    });
  }

  get({ codes }) {
    return api.get(`/icd10`, {
      params: { codes: codes.join(",") },
    });
  }
}

export default new ICD10Service();
