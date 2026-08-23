import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, get, setAuthTokens } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  setAuthTokens: vi.fn(),
}));

vi.mock("../../lib/http", () => ({ default: { post, get } }));
vi.mock("./auth-storage", () => ({
  clearAuthTokens: vi.fn(),
  getRefreshToken: vi.fn(),
  hasStoredTokens: vi.fn(),
  setAuthTokens,
}));

const { authApi } = await import("./api");

describe("authApi MFA transitions", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
    setAuthTokens.mockReset();
  });

  it("does not persist credentials for a password-only MFA challenge", async () => {
    post.mockResolvedValueOnce({ data: { mfa_required: true, mfa_challenge: "opaque" } });

    const result = await authApi.login({ username: "amina", password: "secret" });

    expect(result.mfa_required).toBe(true);
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it("persists tokens only after successful MFA verification", async () => {
    post.mockResolvedValueOnce({ data: { access: "access", refresh: "refresh", user: { id: 1 } } });

    await authApi.verifyMfa("opaque", "123456");

    expect(post).toHaveBeenCalledWith(
      "/api/auth/mfa/challenge/",
      { challenge: "opaque", code: "123456" },
      { skipAuthRefresh: true }
    );
    expect(setAuthTokens).toHaveBeenCalledWith({ access: "access", refresh: "refresh" });
  });

  it("rotates locally stored tokens after enrollment and disablement", async () => {
    post
      .mockResolvedValueOnce({ data: { enabled: true, recovery_codes: ["ONE"], access: "enabled-access", refresh: "enabled-refresh" } })
      .mockResolvedValueOnce({ data: { enabled: false, access: "disabled-access", refresh: "disabled-refresh" } });

    await authApi.confirmMfaEnrollment("123456");
    await authApi.disableMfa("password", "RECOVERY");

    expect(setAuthTokens).toHaveBeenNthCalledWith(1, { access: "enabled-access", refresh: "enabled-refresh" });
    expect(setAuthTokens).toHaveBeenNthCalledWith(2, { access: "disabled-access", refresh: "disabled-refresh" });
  });
});
