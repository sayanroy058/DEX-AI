import { describe, it, expect } from "vitest";
import { backendMarketFor, backendOptionsMarketFor, frontendSymbolFor, registeredFuturesSymbols } from "./backendMarkets";

describe("backendMarketFor", () => {
  it("resolves all currently-registered symbols", () => {
    expect(backendMarketFor("BTC-USDT")).toEqual({ symbol: "BTC-USDT", market: "SPOT" });
    expect(backendMarketFor("ETH-USDT")).toEqual({ symbol: "ETH-USDT", market: "SPOT" });
    expect(backendMarketFor("SOL-USDT")).toEqual({ symbol: "SOL-USDT", market: "SPOT" });
    expect(backendMarketFor("BTC-PERP")).toEqual({ symbol: "BTC-USDC", market: "FUTURES" });
    expect(backendMarketFor("ETH-PERP")).toEqual({ symbol: "ETH-USDC", market: "FUTURES" });
  });

  it("returns null for a symbol with no backend market", () => {
    // This is the exact case that used to trigger a fake "order placed"
    // success toast in TradePanel.tsx — asserting it stays null pins the
    // contract the honest-error fix depends on.
    expect(backendMarketFor("EURUSD")).toBeNull();
    expect(backendMarketFor("AAPL")).toBeNull();
    expect(backendMarketFor("SOL-PERP")).toBeNull();
  });
});

describe("registeredFuturesSymbols", () => {
  it("returns only FUTURES entries, in engine-symbol form", () => {
    const futures = registeredFuturesSymbols();
    expect(futures).toContainEqual({ symbol: "BTC-USDC", market: "FUTURES" });
    expect(futures).toContainEqual({ symbol: "ETH-USDC", market: "FUTURES" });
    // No SPOT entries should leak in.
    expect(futures.every((f) => f.market === "FUTURES")).toBe(true);
  });
});

describe("frontendSymbolFor", () => {
  it("is the inverse of backendMarketFor for registered symbols", () => {
    expect(frontendSymbolFor("BTC-USDC", "FUTURES")).toBe("BTC-PERP");
    expect(frontendSymbolFor("ETH-USDC", "FUTURES")).toBe("ETH-PERP");
    expect(frontendSymbolFor("SOL-USDT", "SPOT")).toBe("SOL-USDT");
  });

  it("falls back to the engine symbol itself when unregistered", () => {
    expect(frontendSymbolFor("DOGE-USDT", "SPOT")).toBe("DOGE-USDT");
  });
});

describe("backendOptionsMarketFor", () => {
  it("resolves the configured underlying for BTC", () => {
    expect(backendOptionsMarketFor("BTC")).toEqual({ symbol: "BTC-USDT", market: "OPTIONS" });
  });

  it("returns null for an asset with no options underlying configured", () => {
    expect(backendOptionsMarketFor("ETH")).toBeNull();
  });
});
