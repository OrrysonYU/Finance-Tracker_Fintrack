import { useState } from "react";
import { act, create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeGoogleSignIn } = vi.hoisted(() => ({ completeGoogleSignIn: vi.fn() }));
vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ completeGoogleSignIn: (payload) => completeGoogleSignIn(payload) }) }));
const { default: GoogleCallbackPage } = await import("./GoogleCallbackPage");

describe("GoogleCallbackPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("submits the provider code and state, then handles success", async () => {
    completeGoogleSignIn.mockResolvedValue({ access: "access", refresh: "refresh" });
    await act(async () => { create(<MemoryRouter initialEntries={["/oauth/google/callback?code=code-1&state=state-1"]}><GoogleCallbackPage /></MemoryRouter>); });
    expect(completeGoogleSignIn).toHaveBeenCalledWith({ code: "code-1", state: "state-1" });
  });

  it("submits the single-use state only once across re-renders", async () => {
    // AuthProvider rebuilds completeGoogleSignIn and its context value on every render, and
    // completeGoogleSignIn calls setUser before it resolves, so the callback effect's
    // dependencies change while the request is still in flight. Resubmitting would replay an
    // already-consumed state and fail. The request is left pending here so nothing navigates
    // and the re-render is the only thing under test.
    completeGoogleSignIn.mockReturnValue(new Promise(() => {}));
    let rerender;
    function Harness() {
      const [tick, setTick] = useState(0);
      rerender = () => setTick(tick + 1);
      return (
        <MemoryRouter initialEntries={["/oauth/google/callback?code=code-1&state=state-1"]}><GoogleCallbackPage /></MemoryRouter>
      );
    }
    await act(async () => { create(<Harness />); });
    expect(completeGoogleSignIn).toHaveBeenCalledTimes(1);
    await act(async () => { rerender(); });
    await act(async () => { rerender(); });
    expect(completeGoogleSignIn).toHaveBeenCalledTimes(1);
  });

  it("renders a safe retryable failure when the callback is rejected", async () => {
    // No detail on the response: the page must fall back to its own sanitized message rather
    // than rendering whatever came back.
    completeGoogleSignIn.mockRejectedValue({ response: { data: {} } });
    let tree;
    await act(async () => { tree = create(<MemoryRouter initialEntries={["/oauth/google/callback?state=state-1"]}><GoogleCallbackPage /></MemoryRouter>); });
    expect(JSON.stringify(tree.toJSON())).toContain("Google authentication could not be completed");
    expect(completeGoogleSignIn).toHaveBeenCalledWith({ state: "state-1" });
  });

  it("never contacts the API when the state parameter is missing", async () => {
    let tree;
    await act(async () => { tree = create(<MemoryRouter initialEntries={["/oauth/google/callback?code=code-1"]}><GoogleCallbackPage /></MemoryRouter>); });
    expect(completeGoogleSignIn).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Google authentication could not be completed");
  });
});
