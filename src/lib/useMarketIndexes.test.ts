import { describe, expect, it } from "vitest";
import { IndexedMarket, IndexBatchItem, mergeIndexData } from "./useMarketIndexes";

function market(overrides: Partial<IndexedMarket> = {}): IndexedMarket {
  return {
    symbol: "BTC-USDT",
    base: "BTC",
    quote: "USDT",
    category: "spot",
    asset: "crypto",
    price: null,
    change24h: null,
    volume24h: null,
    high24h: null,
    low24h: null,
    dataStatus: "unavailable",
    updatedAt: null,
    source: null,
    ...overrides,
  };
}

function indexItem(overrides: Partial<IndexBatchItem> = {}): IndexBatchItem {
  return {
    base: "BTC",
    price: "72000.5",
    fresh: true,
    status: "live",
    ageMs: 100,
    timestampMs: 1_800_000_000_000,
    source: "binance:btcusdt",
    changePercent: 2.4,
    high: 73000,
    low: 70000,
    quoteVolume: 123456,
    ...overrides,
  };
}

describe("mergeIndexData", () => {
  it("maps a fresh Redis-backed index onto the market metadata", () => {
    const [result] = mergeIndexData([market()], [indexItem()]);

    expect(result).toMatchObject({
      price: 72000.5,
      change24h: 2.4,
      volume24h: 123456,
      high24h: 73000,
      low24h: 70000,
      dataStatus: "live",
      source: "binance:btcusdt",
    });
  });

  it("does not invent volume for a non-crypto Price Fetcher source", () => {
    const [result] = mergeIndexData(
      [market({ symbol: "EURUSD", base: "EURUSD", asset: "forex" })],
      [indexItem({ base: "EURUSD", price: "1.08", quoteVolume: 0, source: "liverates:EURUSD" })],
    );

    expect(result.volume24h).toBeNull();
    expect(result.price).toBe(1.08);
  });

  it("keeps the last real value but marks it stale when the feed disappears", () => {
    const previous = market({ price: 71000, change24h: 1.2, dataStatus: "live" });
    const [result] = mergeIndexData([previous], [indexItem({ price: "0", fresh: false, status: "unavailable" })]);

    expect(result.price).toBe(71000);
    expect(result.change24h).toBe(1.2);
    expect(result.dataStatus).toBe("stale");
  });

  it("shows unavailable instead of a fallback value before any real tick", () => {
    const [result] = mergeIndexData([market()], []);

    expect(result.price).toBeNull();
    expect(result.dataStatus).toBe("unavailable");
  });
});
