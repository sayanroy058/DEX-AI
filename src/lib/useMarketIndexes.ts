import { useEffect, useMemo, useState } from "react";
import { INITIAL_MARKETS, Market } from "./mockData";

const BOTS_API_URL = import.meta.env.VITE_BOTS_API_URL ?? "http://localhost:8082";
const POLL_MS = 1_000;

export type MarketDataStatus = "live" | "stale" | "unavailable";

export type IndexedMarket = Omit<
  Market,
  "price" | "change24h" | "volume24h" | "funding" | "openInterest" | "trending" | "dataStatus" | "updatedAt"
> & {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  dataStatus: MarketDataStatus;
  updatedAt: number | null;
  source: string | null;
};

export type IndexBatchItem = {
  base: string;
  price: string;
  fresh: boolean;
  status: MarketDataStatus;
  ageMs: number;
  timestampMs: number;
  source?: string;
  changePercent: number;
  high: number;
  low: number;
  quoteVolume: number;
};

type IndexBatchResponse = { indexes: IndexBatchItem[] };

const MARKET_METADATA: IndexedMarket[] = INITIAL_MARKETS.map((market) => ({
  symbol: market.symbol,
  base: market.base,
  quote: market.quote,
  category: market.category,
  asset: market.asset,
  favorite: market.favorite,
  price: null,
  change24h: null,
  volume24h: null,
  high24h: null,
  low24h: null,
  dataStatus: "unavailable",
  updatedAt: null,
  source: null,
}));

export const PRICE_FETCHER_BASES = Array.from(new Set(MARKET_METADATA.map((market) => market.base)));

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mergeIndexData(
  current: IndexedMarket[],
  items: IndexBatchItem[],
): IndexedMarket[] {
  const byBase = new Map(items.map((item) => [item.base, item]));

  return current.map((market) => {
    const item = byBase.get(market.base);
    const price = finiteNumber(item?.price);
    if (!item || price === null || price <= 0 || item.status === "unavailable") {
      return market.price === null
        ? { ...market, dataStatus: "unavailable" }
        : { ...market, dataStatus: "stale" };
    }

    const change = finiteNumber(item.changePercent);
    const high = finiteNumber(item.high);
    const low = finiteNumber(item.low);
    const volume = finiteNumber(item.quoteVolume);
    return {
      ...market,
      price,
      change24h: change,
      // Live-Rates does not supply volume for FX, commodities, or stocks.
      volume24h: market.asset === "crypto" && volume !== null && volume >= 0 ? volume : null,
      high24h: high !== null && high > 0 ? high : null,
      low24h: low !== null && low > 0 ? low : null,
      dataStatus: item.fresh && item.status === "live" ? "live" : "stale",
      updatedAt: item.timestampMs > 0 ? item.timestampMs : null,
      source: item.source ?? null,
    };
  });
}

function markFeedFailure(current: IndexedMarket[]): IndexedMarket[] {
  return current.map((market) => ({
    ...market,
    dataStatus: market.price === null ? "unavailable" : "stale",
  }));
}

export function useMarketIndexes() {
  const [markets, setMarkets] = useState<IndexedMarket[]>(MARKET_METADATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => {
    const bases = PRICE_FETCHER_BASES.map(encodeURIComponent).join(",");
    return `${BOTS_API_URL}/indexes?bases=${bases}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const poll = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`market indexes ${response.status}`);
        const body = (await response.json()) as IndexBatchResponse;
        if (!Array.isArray(body.indexes)) throw new Error("invalid market index response");
        if (cancelled) return;
        setMarkets((current) => mergeIndexData(current, body.indexes));
        setError(null);
      } catch (cause) {
        if (cancelled || (cause instanceof DOMException && cause.name === "AbortError")) return;
        setMarkets(markFeedFailure);
        setError("The live market data feed is currently unavailable.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(() => void poll(), POLL_MS);
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [url]);

  return { markets, loading, error };
}
