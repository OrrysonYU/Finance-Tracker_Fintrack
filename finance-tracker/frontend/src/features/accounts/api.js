import http from "../../lib/http";

const ACCOUNTS_URL = "/api/finance/accounts/";

function unwrapList(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export const accountTypes = [
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Other" },
];

export const accountsApi = {
  async list() {
    const { data } = await http.get(ACCOUNTS_URL);
    return unwrapList(data);
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

  async remove(id) {
    await http.delete(`${ACCOUNTS_URL}${id}/`);
    return id;
  },
};

