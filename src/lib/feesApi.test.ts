import { describe, it, expect, vi, afterEach } from "vitest";
import { getFeeTiers, getMyFeeSubscription, subscribeFeeTier } from "./feesApi";

function mockFetchJSON(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
  });
}

describe("feesApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getFeeTiers requests /fees/tiers and returns the tier list", async () => {
    const tiers = [{ tier: 1, bi2xusdValue: "500", discountPct: "5", active: true, bi2xCost: "133.333333" }];
    global.fetch = mockFetchJSON({ tiers });
    const result = await getFeeTiers();
    expect(result.tiers).toEqual(tiers);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/fees/tiers"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("getMyFeeSubscription returns active:false when the user has no subscription", async () => {
    global.fetch = mockFetchJSON({ active: false });
    const result = await getMyFeeSubscription();
    expect(result).toEqual({ active: false });
  });

  it("subscribeFeeTier posts the chosen tier and returns the purchase result", async () => {
    const purchase = {
      tier: 3,
      discountPct: "15",
      bi2xPriceUsed: "3.75",
      bi2xAmountPaid: "1333333333",
      purchasedAt: "2026-09-12T00:00:00Z",
      expiresAt: "2027-09-12T00:00:00Z",
    };
    global.fetch = mockFetchJSON(purchase);
    const result = await subscribeFeeTier(3);
    expect(result).toEqual(purchase);
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ tier: 3 });
  });

  it("surfaces the server's error message on a failed subscribe", async () => {
    global.fetch = mockFetchJSON({ error: "BI2X price is temporarily unavailable, try again shortly" }, false, 503);
    await expect(subscribeFeeTier(1)).rejects.toThrow("BI2X price is temporarily unavailable");
  });
});
