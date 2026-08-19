import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  hasStoredTokens,
  setAuthTokens,
} from "./auth-storage";

describe("auth token storage", () => {
  beforeEach(() => {
    const values = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
        clear: () => values.clear(),
      },
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it("stores both tokens and reports an active session", () => {
    setAuthTokens({ access: "access-token", refresh: "refresh-token" });

    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
    expect(hasStoredTokens()).toBe(true);
  });

  it("clears stale credentials completely", () => {
    setAuthTokens({ access: "access-token", refresh: "refresh-token" });
    clearAuthTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasStoredTokens()).toBe(false);
  });
});
