import http from "../../lib/http";
import { fetchAllPages } from "../../lib/api-pagination";

const ACCOUNTS_URL = "/api/finance/accounts/";

export const accountTypes = [
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Other" },
];

export const accountsApi = {
  async list(params = {}) {
    const requestParams = params?.queryKey ? {} : params;
    return fetchAllPages(http, ACCOUNTS_URL, requestParams);
  },

  async create(payload) {
    const { data } = await http.post(ACCOUNTS_URL, {
      name: payload.name.trim(),
      type: payload.type,
      currency: payload.currency.trim().toUpperCase(),
      opening_balance: payload.opening_balance,
    });
    return data;
  },

  async update({ id, ...payload }) {
    const { data } = await http.patch(`${ACCOUNTS_URL}${id}/`, {
      name: payload.name.trim(),
      type: payload.type,
      currency: payload.currency.trim().toUpperCase(),
    });
    return data;
  },

  async remove(id) {
    await http.delete(`${ACCOUNTS_URL}${id}/`);
    return id;
  },
};
