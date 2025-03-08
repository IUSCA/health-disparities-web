import dayjs from "dayjs";
import api from "./api";
import { memoize } from "./utils";

class accessKeyService {
  getKey = memoize(async (key) => {
    const res = await api.get("/access_keys", { params: { key } });
    const keys = res.data.data;
    if (keys.length === 0) {
      return null;
    }
    return keys[0];
  });

  getAll({ username = null, params = {} } = {}) {
    if (username) {
      return api.get(`/access_keys/${username}`, { params });
    }
    return api.get(`/access_keys`, { params });
  }

  create({ username, ...data }) {
    return api.post(`/access_keys/${username}`, data);
  }

  revoke({ username, key }) {
    return api.delete(`/access_keys/${username}/${key}`);
  }

  delete(key) {
    return api.delete(`/access_keys/${key}`);
  }

  isExpired(key) {
    return dayjs(key.expires_at).isBefore(dayjs());
  }

  getAllScopes(params = {}) {
    return api.get("/access_keys/scopes", {
      params,
    });
  }

  createScope(data) {
    return api.post("/access_keys/scopes", data);
  }

  deleteScope(id) {
    return api.delete(`/access_keys/scopes/${id}`);
  }

  getAuditLogs(params = {}) {
    return api.get("/access_keys/audit_logs", { params });
  }
}

export default new accessKeyService();
