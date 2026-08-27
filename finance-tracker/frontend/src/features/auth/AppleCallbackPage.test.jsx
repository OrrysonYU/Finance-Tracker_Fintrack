import { act, create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";

const completeAppleSignIn = vi.fn();
const navigate = vi.fn();
vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ completeAppleSignIn }) }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

import AppleCallbackPage from "./AppleCallbackPage";

describe("AppleCallbackPage", () => {
  beforeEach(() => { completeAppleSignIn.mockReset(); navigate.mockReset(); });
  it("submits a sanitized callback once and routes after success", async () => {
    completeAppleSignIn.mockResolvedValue({ access: "a", refresh: "r" });
    await act(async () => { create(<MemoryRouter initialEntries={["/oauth/apple/callback?code=c&state=s&foo=secret"]}><AppleCallbackPage /></MemoryRouter>); });
    expect(completeAppleSignIn).toHaveBeenCalledWith({ state: "s", code: "c" });
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });
  it("forwards a provider error with its state so the backend burns the attempt", async () => {
    completeAppleSignIn.mockRejectedValue({ response: { data: { detail: "Apple authentication was cancelled or could not be completed." } } });
    await act(async () => { create(<MemoryRouter initialEntries={["/oauth/apple/callback?state=s&error=user_cancelled_authorize"]}><AppleCallbackPage /></MemoryRouter>); });
    expect(completeAppleSignIn).toHaveBeenCalledWith({ state: "s", error: "user_cancelled_authorize" });
    expect(navigate).not.toHaveBeenCalled();
  });
  it("does not submit without state", async () => {
    await act(async () => { create(<MemoryRouter initialEntries={["/oauth/apple/callback?code=c"]}><AppleCallbackPage /></MemoryRouter>); });
    expect(completeAppleSignIn).not.toHaveBeenCalled();
  });
});
