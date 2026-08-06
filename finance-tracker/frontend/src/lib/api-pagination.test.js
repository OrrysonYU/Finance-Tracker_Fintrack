import { describe, expect, it, vi } from "vitest";

import {
  fetchAllPages,
  normalizeList,
  normalizePage,
} from "./api-pagination";

describe("API collection normalization", () => {
  it("preserves supported list and paginated payloads", () => {
    const records = [{ id: 1 }, { id: 2 }];

    expect(normalizeList(records)).toBe(records);
    expect(normalizeList({ results: records })).toBe(records);
    expect(normalizePage({ count: 2, results: records })).toEqual({
      count: 2,
      next: null,
      previous: null,
      results: records,
    });
  });

  it("turns missing or malformed collections into stable empty data", () => {
    expect(normalizeList(null)).toEqual([]);
    expect(normalizeList({ results: { id: 1 } })).toEqual([]);
    expect(normalizePage({ count: "invalid", results: "invalid" })).toEqual({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  it("contains a malformed later page without losing valid records", async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          data: { results: [{ id: 1 }], next: "/page-2" },
        })
        .mockResolvedValueOnce({
          data: { results: { id: 2 }, next: null },
        }),
    };

    await expect(fetchAllPages(client, "/records")).resolves.toEqual([
      { id: 1 },
    ]);
  });
});
