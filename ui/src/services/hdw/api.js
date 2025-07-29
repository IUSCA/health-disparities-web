import router from "@/router";
import axios from "axios";

const token = ref(useLocalStorage("token", ""));

const axiosInstance = axios.create({
  baseURL: "/hdw-api",
});

axiosInstance.interceptors.request.use(
  (config) => {
    const _token = token.value;
    if (_token) {
      config.headers.Authorization = `Bearer ${_token}`;
    }
    // for all requests, set the Accept header to application/json
    config.headers.Accept = "application/json";

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// If API call has failed because of 401 Unauthorized
// navigate to logout page
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      console.error("Error: Unauthorized", err);
      router.push("/auth/logout"); // logout
    }
    return Promise.reject(err);
  },
);

export default axiosInstance;
