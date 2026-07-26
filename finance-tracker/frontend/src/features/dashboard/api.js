import http from "../../lib/http";

const DASHBOARD_OVERVIEW_URL = "/api/reports/dashboard-overview/";

export const DASHBOARD_QUERY_KEY = ["dashboard-overview"];

export const dashboardApi = {
  async getOverview() {
    const { data } = await http.get(DASHBOARD_OVERVIEW_URL);
    return data;
  },
};
