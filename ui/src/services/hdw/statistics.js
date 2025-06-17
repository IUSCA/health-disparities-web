import api from "@/services/hdw/api";

class StatisticsService {
  get() {
    return api.get("/statistics");
  }
}

export default new StatisticsService();
