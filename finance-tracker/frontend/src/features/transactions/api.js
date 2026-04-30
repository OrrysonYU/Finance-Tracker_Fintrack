import http from "../../lib/http";

const TRANSACTIONS_URL = "/api/finance/transactions/";
const ACCOUNTS_URL = "/api/finance/accounts/";
const CATEGORIES_URL = "/api/finance/categories/";

function unwrapList(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export const transactionsApi = {
  async list(params = {}) {
    const { data } = await http.get(TRANSACTIONS_URL, { params });
    return unwrapList(data);
  },

  async create(payload) {
    const request = {
      account: Number(payload.account),
      amount: payload.amount,
      is_credit: payload.is_credit,
      description: payload.description.trim(),
    };

    if (payload.category) {
      request.category = Number(payload.category);
    }

    const { data } = await http.post(TRANSACTIONS_URL, request);
    return data;
  },

  async remove(id) {
    await http.delete(`${TRANSACTIONS_URL}${id}/`);
    return id;
  },
};

export const transactionSupportApi = {
  async listAccounts() {
    const { data } = await http.get(ACCOUNTS_URL);
    return unwrapList(data);
  },

  async listCategories() {
    const { data } = await http.get(CATEGORIES_URL);
    return unwrapList(data);
  },
};
