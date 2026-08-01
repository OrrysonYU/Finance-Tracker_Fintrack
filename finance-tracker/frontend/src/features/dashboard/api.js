import http from "../../lib/http";

const DASHBOARD_OVERVIEW_URL = "/api/reports/dashboard-overview/";
const MONTHLY_SUMMARY_URL = "/api/reports/monthly-summary/";

export const DASHBOARD_QUERY_KEY = ["dashboard-overview"];
export const DASHBOARD_TREND_QUERY_KEY = ["dashboard-monthly-trend"];

function getRecentMonthAnchors(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1)
    );
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      period:
        date.getUTCFullYear() +
        "-" +
        String(date.getUTCMonth() + 1).padStart(2, "0"),
    };
  }).reverse();
}

export const dashboardApi = {
  async getOverview() {
    const { data } = await http.get(DASHBOARD_OVERVIEW_URL);
    return data;
  },

  async getMonthlyTrend({ months = 6 } = {}) {
    const anchors = getRecentMonthAnchors(months);
    return Promise.all(
      anchors.map(async (anchor) => {
        const { data } = await http.get(MONTHLY_SUMMARY_URL, {
          params: { year: anchor.year, month: anchor.month },
        });
        return { ...data, period: anchor.period };
      })
    );
  },
};
