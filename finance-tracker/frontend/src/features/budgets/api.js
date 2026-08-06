import http from "../../lib/http";
import { normalizeList } from "../../lib/api-pagination";

const BUDGETS_URL = "/api/budgets/budgets/";
const CATEGORIES_URL = "/api/finance/categories/";

function buildBudgetPayload(payload) {
  const request = {
    name: payload.name.trim(),
    period: payload.period,
    items: payload.items.map((item) => ({
      category: Number(item.category),
      limit_amount: item.limit_amount,
    })),
  };

  if (payload.period === "CUSTOM") {
    request.start_date = payload.start_date;
    request.end_date = payload.end_date;
  }

  return request;
}

export const budgetPeriods = [
  { value: "MONTH", label: "Monthly" },
  { value: "YEAR", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

export const budgetsApi = {
  async list() {
    const { data } = await http.get(BUDGETS_URL);
    return normalizeList(data);
  },

  async create(payload) {
    const { data } = await http.post(BUDGETS_URL, buildBudgetPayload(payload));
    return data;
  },

  async getUtilization(id) {
    const { data } = await http.get(`${BUDGETS_URL}${id}/utilization/`);
    return data;
  },
};

export const budgetSupportApi = {
  async listExpenseCategories() {
    const { data } = await http.get(CATEGORIES_URL);
    return normalizeList(data).filter(
      (category) => category.category_type === "EXPENSE" && category.is_active
    );
  },
};
