import { useEffect, useRef, useState } from "react";

// The INDEX price is the price-fetcher's Redis-backed reference — the same
// number the market-maker quotes and marks P/L against, and the engine's mark
// price. Reading it here (instead of polling Binance directly in the browser)
// keeps the trade header consistent with the rest of the platform.
//
// PRIMARY SOURCE is the bots service's SSE stream (GET /index/stream?base=X):
// one pushed frame per second on a single connection, replacing the old
// per-tab 1 req/s GET /index/{base} polling. The REST endpoint remains as the
// bootstrap + fallback path and pauses while the stream is delivering.
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

function toTicker(base: string, d: { price: string; fresh: boolean; changePercent: number; high: number; low: number; quoteVolume: number }): IndexTicker {
  const price = parseFloat(d.price);
  return {
    base,
    lastPrice: Number.isFinite(price) ? price : 0,
    changePercent: d.changePercent,
    high: d.high,
    low: d.low,
    quoteVolume: d.quoteVolume,
    fresh: d.fresh,
  };
}

async function fetchIndex(base: string): Promise<void> {
  // NOT upper-cased: the backend now does an exact (case-preserving) Redis
  // lookup — Live-Rates.com stock tickers are stored with a case-sensitive
  // suffix ("AAPL.us", not "AAPL.US"), so forcing upper case here would
  // silently miss them. Crypto/forex/commodity bases are already
  // upper-case in mockData.ts, so this is a no-op for those.
  const res = await fetch(`${BOTS_API_URL}/index/${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error(`index ${res.status}`);
  const d: IndexResponse = await res.json();
  cache.set(base, { ...toTicker(base, d), ts: Date.now() });
}

// Fallback cadence only — while the SSE stream delivers, the poll is skipped.
const FALLBACK_POLL_MS = 5000;

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

  // Primary: SSE stream. One EventSource per hook instance — the components
  // using this hook are few (header/panel scoped to the active base), so the
  // cost is one long-lived connection each instead of a per-second request.
  // Guarded for environments without EventSource (tests, exotic webviews):
  // they simply run on the REST fallback poll below.
  useEffect(() => {
    if (!base) {
      setTick(null);
      return;
    }
    if (typeof EventSource === "undefined") return;
    let cancelled = false;
    const es = new EventSource(`${BOTS_API_URL}/index/stream?base=${encodeURIComponent(base)}`);
    es.onmessage = (e) => {
      if (cancelled || baseRef.current !== base) return;
      try {
        const d: IndexResponse = JSON.parse(e.data);
        if (!(parseFloat(d.price) > 0)) return; // stale/absent key: keep last known
        cache.set(base, { ...toTicker(base, d), ts: Date.now() });
        setTick(fromCache(base));
      } catch {
        // malformed frame: keep last known value
      }
    };
    // onerror: EventSource auto-reconnects; nothing to do. The REST fallback
    // below covers the window while the stream is down.
    return () => {
      cancelled = true;
      es.close();
    };
  }, [base]);

  // Fallback: initial bootstrap fetch + slow poll while the stream is down.
  useEffect(() => {
    if (!base) return;
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
    const id = setInterval(() => {
      const c = cache.get(base);
      // Skip while the SSE stream is delivering fresh frames (within 2s).
      if (c && Date.now() - c.ts < 2000) return;
      void poll();
    }, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [base]);

  return tick;
}
