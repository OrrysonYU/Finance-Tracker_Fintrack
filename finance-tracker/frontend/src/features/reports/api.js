import http from "../../lib/http";

const MONTHLY_SUMMARY_URL = "/api/reports/monthly-summary/";
const CATEGORY_SPEND_URL = "/api/reports/category-spend/";

export const REPORT_QUERY_KEY = ["reports", "period"];
export const REPORT_TREND_QUERY_KEY = ["reports", "trend"];

function getAnchor(period) {
  const [year, month] = period.split("-").map(Number);
  return { year, month };
}

function getMonthAnchors(period, count) {
  const { year, month } = getAnchor(period);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - index - 1), 1));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      period: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  });
}

async function getMonthlySummary(anchor) {
  const { data } = await http.get(MONTHLY_SUMMARY_URL, { params: anchor });
  return data;
}

export const reportsApi = {
  async getPeriod(period) {
    const anchor = getAnchor(period);
    const [summaryResponse, categoryResponse] = await Promise.all([
      http.get(MONTHLY_SUMMARY_URL, { params: anchor }),
      http.get(CATEGORY_SPEND_URL, { params: anchor }),
    ]);
    return { summary: summaryResponse.data, categorySpend: categoryResponse.data };
  },

  async getTrend({ period, months = 6 }) {
    const anchors = getMonthAnchors(period, months);
    return Promise.all(
      anchors.map(async (anchor) => ({
        ...(await getMonthlySummary({ year: anchor.year, month: anchor.month })),
        period: anchor.period,
      }))
    );
  },
};
