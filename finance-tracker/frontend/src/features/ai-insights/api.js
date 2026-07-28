import http from "../../lib/http";

const AI_INSIGHTS_URL = "/api/ai-insights";
const TRANSACTIONS_URL = "/api/finance/transactions/";
const MAX_SUGGESTIONS = 3;

export const AI_INSIGHTS_QUERY_KEY = ["dashboard-ai-insights"];

function unwrapList(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

async function getSpendingInsights() {
  const { data } = await http.get(`${AI_INSIGHTS_URL}/spending-insights/`);
  return data;
}

async function getTransactionAnomalies() {
  const { data } = await http.get(`${AI_INSIGHTS_URL}/transaction-anomalies/`, {
    params: { days: 90, limit: 5 },
  });
  return data;
}

async function getBudgetForecast(budgetId) {
  const { data } = await http.get(
    `${AI_INSIGHTS_URL}/budget-forecasts/${budgetId}/`
  );
  return data;
}

async function getCategorySuggestions() {
  const { data } = await http.get(TRANSACTIONS_URL, {
    params: { ordering: "-timestamp" },
  });
  const candidates = unwrapList(data)
    .filter(
      (transaction) =>
        transaction.category == null && transaction.description?.trim()
    )
    .slice(0, MAX_SUGGESTIONS);

  const results = await Promise.allSettled(
    candidates.map(async (transaction) => {
      const response = await http.post(`${AI_INSIGHTS_URL}/category-suggestions/`, {
        description: transaction.description,
        is_credit: transaction.is_credit,
      });
      if (!response.data?.suggestion) return null;

      return {
        transaction: {
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          timestamp: transaction.timestamp,
        },
        suggestion: response.data.suggestion,
      };
    })
  );

  const items = results
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
  return {
    items,
    failedCount: results.filter((result) => result.status === "rejected").length,
  };
}

function fulfilledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

export const aiInsightsApi = {
  async getDashboardData({ budgetIds = [] } = {}) {
    const uniqueBudgetIds = [...new Set(budgetIds.filter(Boolean))].slice(0, 5);
    const [spendingResult, anomaliesResult, suggestionsResult, forecastsResult] =
      await Promise.allSettled([
        getSpendingInsights(),
        getTransactionAnomalies(),
        getCategorySuggestions(),
        Promise.allSettled(uniqueBudgetIds.map(getBudgetForecast)),
      ]);

    const forecastResults = fulfilledValue(forecastsResult, []);
    const forecasts = forecastResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const forecastFailures = forecastResults.filter(
      (result) => result.status === "rejected"
    ).length;
    const sourceFailures = [spendingResult, anomaliesResult].filter(
      (result) => result.status === "rejected"
    ).length;
    const suggestionPayload = fulfilledValue(suggestionsResult, {
      items: [],
      failedCount: 0,
    });
    const primarySourcesAvailable = sourceFailures < 2 || forecasts.length > 0;

    return {
      spending: fulfilledValue(spendingResult, null),
      anomalies: fulfilledValue(anomaliesResult, null),
      suggestions: suggestionPayload.items,
      forecasts,
      unavailable: !primarySourcesAvailable,
      partialFailure:
        sourceFailures > 0 ||
        suggestionsResult.status === "rejected" ||
        suggestionPayload.failedCount > 0 ||
        forecastFailures > 0,
    };
  },
};
