import dayjs from "dayjs";
import api from "./api";

class UserService {
  getAll({ search = "", sortBy, sort_order, skip, take } = {}) {
    return api
      .get("/users", {
        params: {
          search,
          sortBy,
          sort_order,
          skip,
          take,
        },
      })
      .then((response) => {
        const { metadata, users } = response.data;
        return { metadata, users };
      });
  }

  createUser(user_data) {
    return api.post("/users", user_data).then((response) => response.data);
  }

  modifyUser(username, updates) {
    return api
      .patch(`/users/${username}`, updates)
      .then((response) => response.data);
  }

  deleteUser(username) {
    return api.delete(`/users/${username}`).then((response) => response.data);
  }

  getApiKeys() {
    return api.get(`/users/api_keys`);
  }

  getApiKey(username) {
    return api.get(`/users/${username}/api_key`);
  }

  createApiKey(username) {
    return api.post(`/users/${username}/api_key`);
  }

  deleteApiKey(username) {
    return api.delete(`/users/${username}/api_key`);
  }

  isApiKeyexpired(key) {
    return dayjs(key.expires_at).diff(new Date()) < 0;
  }
}

export default new UserService();
