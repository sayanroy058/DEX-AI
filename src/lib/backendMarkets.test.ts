import { describe, it, expect } from "vitest";
import { backendMarketFor, backendOptionsMarketFor, frontendSymbolFor, registeredFuturesSymbols } from "./backendMarkets";

describe("backendMarketFor", () => {
  it("resolves all currently-registered symbols", () => {
    expect(backendMarketFor("BTC-BIUSD")).toEqual({ symbol: "BTC-BIUSD", market: "SPOT" });
    expect(backendMarketFor("ETH-BIUSD")).toEqual({ symbol: "ETH-BIUSD", market: "SPOT" });
    expect(backendMarketFor("SOL-BIUSD")).toEqual({ symbol: "SOL-BIUSD", market: "SPOT" });
    expect(backendMarketFor("BNB-BIUSD")).toEqual({ symbol: "BNB-BIUSD", market: "SPOT" });
    // Futures collateralize/settle in BIUSD too — a distinct (symbol, market)
    // row from the SPOT entry of the same engine symbol name.
    expect(backendMarketFor("BTC-PERP")).toEqual({ symbol: "BTC-BIUSD", market: "FUTURES" });
    expect(backendMarketFor("ETH-PERP")).toEqual({ symbol: "ETH-BIUSD", market: "FUTURES" });
    // Non-crypto perps (FX/commodities/stocks). The engine symbol's base is
    // the Price-Fetcher ticker, case-preserved.
    expect(backendMarketFor("EURUSD")).toEqual({ symbol: "EURUSD-BIUSD", market: "FUTURES" });
    expect(backendMarketFor("XAU-USD")).toEqual({ symbol: "GOLD-BIUSD", market: "FUTURES" });
    expect(backendMarketFor("WTI-USD")).toEqual({ symbol: "CrudeOIL-BIUSD", market: "FUTURES" });
    expect(backendMarketFor("AAPL-PERP")).toEqual({ symbol: "AAPL.us-BIUSD", market: "FUTURES" });
  });

  it("returns null for a symbol with no backend market", () => {
    // This is the exact case that used to trigger a fake "order placed"
    // success toast in TradePanel.tsx — asserting it stays null pins the
    // contract the honest-error fix depends on.
    expect(backendMarketFor("DOGE-PERP")).toBeNull();
    expect(backendMarketFor("USDT-BIUSD")).toBeNull();
  });
});

describe("registeredFuturesSymbols", () => {
  it("returns only FUTURES entries, in engine-symbol form", () => {
    const futures = registeredFuturesSymbols();
    expect(futures).toContainEqual({ symbol: "BTC-BIUSD", market: "FUTURES" });
    expect(futures).toContainEqual({ symbol: "ETH-BIUSD", market: "FUTURES" });
    // No SPOT entries should leak in.
    expect(futures.every((f) => f.market === "FUTURES")).toBe(true);
  });
});

describe("frontendSymbolFor", () => {
  it("is the inverse of backendMarketFor for registered symbols", () => {
    expect(frontendSymbolFor("BTC-BIUSD", "FUTURES")).toBe("BTC-PERP");
    expect(frontendSymbolFor("ETH-BIUSD", "FUTURES")).toBe("ETH-PERP");
    expect(frontendSymbolFor("SOL-BIUSD", "SPOT")).toBe("SOL-BIUSD");
    expect(frontendSymbolFor("GOLD-BIUSD", "FUTURES")).toBe("XAU-USD");
    expect(frontendSymbolFor("AAPL.us-BIUSD", "FUTURES")).toBe("AAPL-PERP");
  });

  it("falls back to the engine symbol itself when unregistered", () => {
    expect(frontendSymbolFor("DOGE-BIUSD", "SPOT")).toBe("DOGE-BIUSD");
  });
});

describe("backendOptionsMarketFor", () => {
  it("resolves the configured underlying for BTC", () => {
    expect(backendOptionsMarketFor("BTC")).toEqual({ symbol: "BTC-BIUSD", market: "OPTIONS" });
  });

  it("returns null for an asset with no options underlying configured", () => {
    expect(backendOptionsMarketFor("ETH")).toBeNull();
  });
});
