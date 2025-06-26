import api from "@/services/api";

class StatisticsService {
  get() {
    return api.get("/hdw/statistics");
  }
}

export default new StatisticsService();
