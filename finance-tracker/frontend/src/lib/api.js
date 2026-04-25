import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — try to refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/token/refresh/`, {
            refresh,
          });
          localStorage.setItem("access_token", data.access);
          if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/* ---------- Auth helpers ---------- */
export const authAPI = {
  login: (creds) => api.post("/api/auth/token/", creds),
  register: (data) => api.post("/api/auth/register/", data),
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
