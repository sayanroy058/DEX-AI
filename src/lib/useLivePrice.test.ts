import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLivePrice } from "./useLivePrice";

// Executable markets must take their price exclusively from the matching
// engine's market-summary feed. An external index is useful for displayed
// non-executable assets, but must not silently replace an unavailable engine
// price in the order-entry path.

function mockIndexFetch(price: number | null) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () =>
      price === null
        ? Promise.reject(new Error("no data"))
        : {
            base: "BTC",
            price: String(price),
            fresh: true,
            ageMs: 100,
            changePercent: 1.5,
            high: price * 1.02,
            low: price * 0.98,
            quoteVolume: 1_000_000,
          },
  });
}

describe("useLivePrice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockIndexFetch(79602.01));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not substitute an index price for an executable market", async () => {
    const { result } = renderHook(() => useLivePrice("BTC-PERP"));

    await waitFor(() => {
      expect(result.current).toBe(0);
    });
  });

  it("reports an unavailable executable price before the engine summary arrives", () => {
    const { result, unmount } = renderHook(() => useLivePrice("BTC-PERP"));
    expect(result.current).toBe(0);
    unmount();
  });

  it("returns 0 for a completely unknown symbol", () => {
    const { result } = renderHook(() => useLivePrice("NOT-A-REAL-SYMBOL"));
    expect(result.current).toBe(0);
  });
});
