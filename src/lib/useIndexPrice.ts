import { useEffect, useRef, useState } from "react";

// The INDEX price is the price-fetcher's Redis-backed reference — the same
// number the market-maker quotes and marks P/L against, and the engine's mark
// price. Reading it here (instead of polling Binance directly in the browser)
// keeps the trade header consistent with the rest of the platform.
const BOTS_API_URL = import.meta.env.VITE_BOTS_API_URL ?? "http://localhost:8082";

export type IndexTicker = {
  base: string;
  lastPrice: number;
  changePercent: number;
  high: number;
  low: number;
  quoteVolume: number;
  fresh: boolean;
};

type IndexResponse = {
  base: string;
  price: string;
  fresh: boolean;
  ageMs: number;
  changePercent: number;
  high: number;
  low: number;
  quoteVolume: number;
};

type CacheEntry = IndexTicker & { ts: number };

// Shared across hook instances so multiple components showing the same base
// don't each hit the endpoint separately.
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<void>>();

async function fetchIndex(base: string): Promise<void> {
  // NOT upper-cased: the backend now does an exact (case-preserving) Redis
  // lookup — Live-Rates.com stock tickers are stored with a case-sensitive
  // suffix ("AAPL.us", not "AAPL.US"), so forcing upper case here would
  // silently miss them. Crypto/forex/commodity bases are already
  // upper-case in mockData.ts, so this is a no-op for those.
  const res = await fetch(`${BOTS_API_URL}/index/${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error(`index ${res.status}`);
  const d: IndexResponse = await res.json();
  const price = parseFloat(d.price);
  if (!(price > 0)) throw new Error("index price non-positive");
  cache.set(base, {
    base: d.base,
    lastPrice: price,
    changePercent: d.changePercent,
    high: d.high,
    low: d.low,
    quoteVolume: d.quoteVolume,
    fresh: d.fresh,
    ts: Date.now(),
  });
}

// Match the price-fetcher's one-second publishing cadence so the displayed
// reference never lags the market-maker's external index by several seconds.
const POLL_MS = 1000;

function fromCache(base: string): IndexTicker | null {
  const c = cache.get(base);
  if (!c) return null;
  const { ts, ...rest } = c;
  void ts;
  return rest;
}

export function useIndexPrice(base: string | undefined): IndexTicker | null {
  const [tick, setTick] = useState<IndexTicker | null>(() =>
    base ? fromCache(base) : null,
  );

  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    if (!base) {
      setTick(null);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      let p = inFlight.get(base);
      if (!p) {
        p = fetchIndex(base).finally(() => inFlight.delete(base));
        inFlight.set(base, p);
      }
      try {
        await p;
      } catch {
        // Network error or stale/absent key: keep last known value, retry next tick.
        return;
      }
      if (cancelled || baseRef.current !== base) return;
      const t = fromCache(base);
      if (t) setTick(t);
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [base]);

  return tick;
}
