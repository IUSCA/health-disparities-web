import { useAuthStore } from "@/stores/auth";
import api from "./api";

const auth = useAuthStore();

class CohortAccessRequests {
  getAll(params) {
    return api.get("/cohort_access_requests", {
      params,
    });
  }

  getById(id) {
    return api.get(`/cohort_access_requests/${id}`);
  }

  getByCohortAndRequester(cohort_id, username) {
    return api.get(
      `/cohort_access_requests/cohort/${cohort_id}/requester/${username}`,
    );
  }

  getByCohortForSelf(cohort_id) {
    return this.getByCohortAndRequester(cohort_id, auth.user.username);
  }

  create(data) {
    return api.post("/cohort_access_requests", data);
  }

  createForSelf(cohort_id) {
    const username = auth.user.username;
    return api.put(
      `/cohort_access_requests/cohort/${cohort_id}/requester/${username}`,
    );
  }

  update(id, data) {
    return api.patch(`/cohort_access_requests/${id}`, data);
  }

  delete(id) {
    return api.delete(`/cohort_access_requests/${id}`);
  }
}

export default new CohortAccessRequests();
