const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasStoredTokens() {
  return Boolean(getAccessToken() || getRefreshToken());
}

export function setAuthTokens({ access, refresh }) {
  if (!canUseStorage()) return;

  if (access) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }

  if (refresh) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearAuthTokens() {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
