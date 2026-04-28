import http from "../../lib/http";
import {
  clearAuthTokens,
  hasStoredTokens,
  setAuthTokens,
} from "./auth-storage";

function persistTokens(data) {
  setAuthTokens({ access: data.access, refresh: data.refresh });
}

export const authApi = {
  async login(credentials) {
    const { data } = await http.post("/api/auth/token/", credentials);
    persistTokens(data);
    return data;
  },

  async register(payload) {
    const { data } = await http.post("/api/auth/register/", payload);
    persistTokens(data);
    return data;
  },

  async getCurrentUser() {
    const { data } = await http.get("/api/auth/me/");
    return data;
  },

  logout() {
    clearAuthTokens();
  },

  hasSession() {
    return hasStoredTokens();
  },
};
