import { describe, it, expect, vi, afterEach } from "vitest";
import { getMyReferral, getMyAffiliateLinks, formatBI2XUSDRaw } from "./referralApi";

function mockFetchJSON(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
  });
}

describe("referralApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMyReferral requests /referral/me and returns the caller's referral data", async () => {
    const data = { code: "DEX-ABC1234", referredCount: 3, earningsRaw: "2000000", sharePct: "20" };
    global.fetch = mockFetchJSON(data);
    const result = await getMyReferral();
    expect(result).toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/referral/me"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("getMyAffiliateLinks returns an empty list when the caller owns no links", async () => {
    global.fetch = mockFetchJSON({ links: null });
    const result = await getMyAffiliateLinks();
    expect(result.links).toBeNull();
  });

  it("getMyAffiliateLinks returns the caller's owned links", async () => {
    const links = [
      {
        ID: "11111111-1111-1111-1111-111111111111",
        Code: "AFF-XYZ123",
        OwnerUserID: "user-1",
        SharePct: "35",
        Active: true,
        JoinedCount: 4,
        EarningsRaw: "5000000",
        CreatedAt: "2026-09-12T00:00:00Z",
      },
    ];
    global.fetch = mockFetchJSON({ links });
    const result = await getMyAffiliateLinks();
    expect(result.links).toEqual(links);
  });

  it("surfaces the server's error message on a failed request", async () => {
    global.fetch = mockFetchJSON({ error: "not authenticated" }, false, 401);
    await expect(getMyReferral()).rejects.toThrow("not authenticated");
  });

  it("formatBI2XUSDRaw formats raw 6-decimal units, trimming trailing zeros", () => {
    expect(formatBI2XUSDRaw("2000000")).toBe("2");
    expect(formatBI2XUSDRaw("2500000")).toBe("2.5");
    expect(formatBI2XUSDRaw("1234567")).toBe("1.234567");
    expect(formatBI2XUSDRaw("0")).toBe("0");
    expect(formatBI2XUSDRaw("")).toBe("0");
  });
});
