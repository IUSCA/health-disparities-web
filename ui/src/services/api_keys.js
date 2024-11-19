import dayjs from "dayjs";
import api from "./api";
import { memoize } from "./utils";

class ApiKeyService {
  getKey = memoize(async (key) => {
    const res = await api.get("/api_keys", { params: { key } });
    const keys = res.data.data;
    if (keys.length === 0) {
      return null;
    }
    return keys[0];
  });

  getAll({ username = null } = {}) {
    if (username) {
      return api.get(`/api_keys/${username}`);
    }
    return api.get(`/api_keys`);
  }

  create({ username, ...data }) {
    return api.post(`/api_keys/${username}`, data);
  }

  revoke({ username, key }) {
    return api.delete(`/api_keys/${username}/${key}`);
  }

  delete(key) {
    return api.delete(`/api_keys/${key}`);
  }

  isExpired(key) {
    return dayjs(key.expires_at).isBefore(dayjs());
  }

  getAllScopes() {
    return api.get("/api_keys/scopes");
  }

  getAuditLogs(params = {}) {
    return api.get("/api_keys/audit_logs", { params });
  }
}

export default new ApiKeyService();
