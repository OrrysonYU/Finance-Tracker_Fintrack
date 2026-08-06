import { beforeEach, describe, expect, it, vi } from "vitest";

import http from "../../lib/http";
import { aiInsightsApi } from "./api";

vi.mock("../../lib/http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("AI insight API resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a safe unavailable state when every source request fails", async () => {
    http.get.mockRejectedValue(new Error("Simulated API outage"));

    await expect(aiInsightsApi.getDashboardData()).resolves.toEqual({
      spending: null,
      anomalies: null,
      suggestions: [],
      forecasts: [],
      unavailable: true,
      partialFailure: true,
    });
  });
});
