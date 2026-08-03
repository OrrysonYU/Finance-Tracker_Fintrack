import http from "../../lib/http";
import { fetchAllPages, normalizePage } from "../../lib/api-pagination";

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

  async listPage(params = {}) {
    const { data } = await http.get(TRANSACTIONS_URL, { params });
    return normalizePage(data);
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
    if (payload.timestamp) {
      request.timestamp = new Date(payload.timestamp).toISOString();
    }

    const { data } = await http.post(TRANSACTIONS_URL, request);
    return data;
  },

  async update({ id, ...payload }) {
    const request = {
      account: Number(payload.account),
      amount: payload.amount,
      is_credit: payload.is_credit,
      description: payload.description.trim(),
      category: payload.category ? Number(payload.category) : null,
    };
    if (payload.timestamp) {
      request.timestamp = new Date(payload.timestamp).toISOString();
    }
    const { data } = await http.patch(`${TRANSACTIONS_URL}${id}/`, request);
    return data;
  },

  async removeMany(ids) {
    const deletedIds = [];
    const failedIds = [];
    let firstError;

    for (const id of ids) {
      try {
        await http.delete(`${TRANSACTIONS_URL}${id}/`);
        deletedIds.push(id);
      } catch (error) {
        failedIds.push(id);
        firstError ||= error;
      }
    }

    if (!deletedIds.length && firstError) throw firstError;

    return { deletedIds, failedIds };
  },

  async remove(id) {
    await http.delete(`${TRANSACTIONS_URL}${id}/`);
    return id;
  },
};

export const transactionSupportApi = {
  async listAccounts() {
    return fetchAllPages(http, ACCOUNTS_URL);
  },

  async listCategories() {
    return fetchAllPages(http, CATEGORIES_URL);
  },
};
