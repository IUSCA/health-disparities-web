import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/hdw-api",
});

export default axiosInstance;
