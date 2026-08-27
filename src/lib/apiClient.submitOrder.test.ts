import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitOrder } from "./apiClient";

// submitOrder posts the order JSON to Dex-Backend's authenticated gateway.
// Account identity must not cross the browser boundary: the gateway derives it
// from dex_session before forwarding the order to the matching engine.

function mockOkFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ orderId: "abc-123", status: "OPEN", filled: "0", trades: 0 }),
  });
}

describe("submitOrder gateway request", () => {
  let fetchSpy: ReturnType<typeof mockOkFetch>;

  beforeEach(() => {
    fetchSpy = mockOkFetch();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function calledRequest(): { url: URL; init: RequestInit; body: Record<string, unknown> } {
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    return { url: new URL(url), init, body: JSON.parse(String(init.body)) as Record<string, unknown> };
  }

  it("sends a plain LIMIT order to the gateway without an account ID", async () => {
    await submitOrder({
      account: "acct-1", symbol: "BTC-USDC", market: "FUTURES",
      side: "BUY", type: "LIMIT", price: "50000", qty: "1",
    });
    const { url, init, body } = calledRequest();
    expect(url.pathname).toBe("/trade/order");
    expect(init.credentials).toBe("include");
    expect(body).toMatchObject({ symbol: "BTC-USDC", market: "FUTURES", side: "BUY", type: "LIMIT", price: "50000", qty: "1" });
    expect(body).not.toHaveProperty("account");
    expect(body).not.toHaveProperty("stopPrice");
    expect(body).not.toHaveProperty("reduceOnly");
    expect(body).not.toHaveProperty("slippageBps");
  });

  it("sends type=STOP with stopPrice for a stop order", async () => {
    await submitOrder({
      account: "acct-1", symbol: "BTC-USDC", market: "FUTURES",
      side: "SELL", type: "STOP", stopPrice: "48000", qty: "1",
    });
    const { body } = calledRequest();
    expect(body.type).toBe("STOP");
    expect(body.stopPrice).toBe("48000");
  });

  it("sends reduceOnly=true only when explicitly set", async () => {
    await submitOrder({
      account: "acct-1", symbol: "BTC-USDC", market: "FUTURES",
      side: "SELL", type: "STOP", stopPrice: "48000", qty: "1", reduceOnly: true,
    });
    expect(calledRequest().body.reduceOnly).toBe(true);
  });

  it("omits reduceOnly entirely when false or unset (never sends reduceOnly=false)", async () => {
    await submitOrder({
      account: "acct-1", symbol: "BTC-USDC", market: "FUTURES",
      side: "BUY", type: "LIMIT", price: "50000", qty: "1", reduceOnly: false,
    });
    expect(calledRequest().body).not.toHaveProperty("reduceOnly");
  });

  it("sends slippageBps for a market order with a slippage cap", async () => {
    await submitOrder({
      account: "acct-1", symbol: "BTC-USDC", market: "SPOT",
      side: "BUY", type: "MARKET", qty: "1", slippageBps: 50,
    });
    const { body } = calledRequest();
    expect(body.type).toBe("MARKET");
    expect(body.slippageBps).toBe(50);
  });

  it("sends type=POST_ONLY unchanged (not silently downgraded client-side)", async () => {
    await submitOrder({
      account: "acct-1", symbol: "BTC-USDC", market: "SPOT",
      side: "BUY", type: "POST_ONLY", price: "50000", qty: "1",
    });
    expect(calledRequest().body.type).toBe("POST_ONLY");
  });
});
