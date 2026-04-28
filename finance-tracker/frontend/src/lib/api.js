import { authApi } from "../features/auth/api";
import api from "./http";

export default api;

/* ---------- Auth helpers ---------- */
export const authAPI = {
  login: (creds) => authApi.login(creds).then((data) => ({ data })),
  register: (data) => authApi.register(data).then((result) => ({ data: result })),
  me: () => api.get("/api/auth/me/"),
};

/* ---------- Finance helpers ---------- */
export const financeAPI = {
  // Accounts
  getAccounts: () => api.get("/api/finance/accounts/"),
  createAccount: (d) => api.post("/api/finance/accounts/", d),
  deleteAccount: (id) => api.delete(`/api/finance/accounts/${id}/`),

  // Transactions
  getTransactions: (params) => api.get("/api/finance/transactions/", { params }),
  createTransaction: (d) => api.post("/api/finance/transactions/", d),
  deleteTransaction: (id) => api.delete(`/api/finance/transactions/${id}/`),

  // Saving Goals
  getSavingGoals: () => api.get("/api/finance/saving-goals/"),
  createSavingGoal: (d) => api.post("/api/finance/saving-goals/", d),
  deleteSavingGoal: (id) => api.delete(`/api/finance/saving-goals/${id}/`),

  // Categories
  getCategories: () => api.get("/api/finance/categories/"),
  createCategory: (d) => api.post("/api/finance/categories/", d),
};

/* ---------- Budget helpers ---------- */
export const budgetAPI = {
  getBudgets: () => api.get("/api/budgets/budgets/"),
  createBudget: (d) => api.post("/api/budgets/budgets/", d),
  utilization: (id) => api.get(`/api/budgets/budgets/${id}/utilization/`),
};

/* ---------- Reports helpers ---------- */
export const reportsAPI = {
  monthlySummary: () => api.get("/api/reports/reports/monthly-summary/"),
  byCategory: () => api.get("/api/reports/reports/by-category/"),
};
