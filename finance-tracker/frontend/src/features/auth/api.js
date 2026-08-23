import http from "../../lib/http";
import {
  clearAuthTokens,
  getRefreshToken,
  hasStoredTokens,
  setAuthTokens,
} from "./auth-storage";

function persistTokens(data) {
  setAuthTokens({ access: data.access, refresh: data.refresh });
}

export const authApi = {
  async login(credentials) {
    const { data } = await http.post("/api/auth/token/", credentials);
    if (data.access && data.refresh) persistTokens(data);
    return data;
  },

  async verifyMfa(challenge, code) {
    const { data } = await http.post(
      "/api/auth/mfa/challenge/",
      { challenge, code },
      { skipAuthRefresh: true }
    );
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

  async updateCurrentUser(payload) {
    const { data } = await http.patch("/api/auth/me/", payload);
    return data;
  },

  async uploadProfileImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await http.post("/api/auth/me/profile-image/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async deleteProfileImage() {
    const { data } = await http.delete("/api/auth/me/profile-image/");
    return data;
  },

  async getProfileImage() {
    return http.get("/api/auth/me/profile-image/", { responseType: "blob" });
  },

  async getMfaStatus() {
    const { data } = await http.get("/api/auth/mfa/status/");
    return data;
  },

  async beginMfaEnrollment(password) {
    const { data } = await http.post("/api/auth/mfa/enroll/", { password });
    return data;
  },

  async confirmMfaEnrollment(code) {
    const { data } = await http.post("/api/auth/mfa/enroll/confirm/", { code });
    persistTokens(data);
    return data;
  },

  async regenerateRecoveryCodes(password, code) {
    const { data } = await http.post("/api/auth/mfa/recovery-codes/", { password, code });
    return data;
  },

  async disableMfa(password, code) {
    const { data } = await http.post("/api/auth/mfa/disable/", { password, code });
    persistTokens(data);
    return data;
  },

  async logout() {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await http.post("/api/auth/logout/", { refresh }, { skipAuthRefresh: true });
      } catch {
        // Local cleanup is still mandatory when the server is unavailable.
      }
    }
    clearAuthTokens();
  },

  hasSession() {
    return hasStoredTokens();
  },
};
