import http from "../../lib/http";

const GOALS_URL = "/api/finance/saving-goals/";

function unwrapList(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export const goalsApi = {
  async list(params = {}) {
    const { data } = await http.get(GOALS_URL, { params });
    return unwrapList(data);
  },

  async create(payload) {
    const request = {
      name: payload.name.trim(),
      description: payload.description.trim(),
      currency: payload.currency.trim().toUpperCase(),
      target_amount: payload.target_amount,
      current_amount: payload.current_amount || "0.00",
    };

    if (payload.deadline) {
      request.deadline = payload.deadline;
    }

    const { data } = await http.post(GOALS_URL, request);
    return data;
  },

  async remove(id) {
    await http.delete(`${GOALS_URL}${id}/`);
    return id;
  },
};
