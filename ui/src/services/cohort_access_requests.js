import { useAuthStore } from "@/stores/auth";
import api from "./api";

const auth = useAuthStore();

class CohortAccessRequests {
  getAll(params) {
    return api.get("/cohort_access_requests", {
      params,
    });
  }

  getAllForSelf(params) {
    return api.get(`/cohort_access_requests/requester/${auth.user.username}`, {
      params,
    });
  }

  getById(id) {
    return api.get(`/cohort_access_requests/${id}`);
  }

  getByIdAndRequester(id, username) {
    return api.get(`/cohort_access_requests/requester/${username}/${id}`);
  }

  getByIdForSelf(id) {
    return this.getByIdAndRequester(id, auth.user.username);
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

  isActive(request) {
    return ["INITIATED", "PENDING"].includes(request?.status);
  }

  sync(request_id) {
    return api.post(`/cohort_access_requests/${request_id}/actions/sync`);
  }
}

export default new CohortAccessRequests();
