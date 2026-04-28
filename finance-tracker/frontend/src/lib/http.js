import axios from "axios";

import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "../features/auth/auth-storage";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const AUTH_SESSION_EXPIRED_EVENT = "fintrack:auth-session-expired";

const http = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

let refreshRequest = null;

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("No refresh token is available.");
  }

  refreshRequest ??= axios
    .post(`${API_URL}/api/auth/token/refresh/`, { refresh })
    .then(({ data }) => {
      setAuthTokens({ access: data.access, refresh: data.refresh });
      return data.access;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/token/");

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const access = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return http(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

export default http;
