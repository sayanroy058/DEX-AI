import { useEffect, useRef, useState } from "react";
import { getTicker } from "./apiClient";

// The engine's real /ticker: order-book-derived bid/ask/mid/mark, plus
// (for FUTURES) the underlying's index price, the funding rate that would
// apply at the next settlement, and the real fee/MMR config — all previously
// either fabricated (mark = price*1.0001, index = price*0.9999) or hardcoded
// client-side (fee rates, MMR). Only meaningful for symbols actually
// registered on the backend; callers should fall back to the mock market
// feed for anything else, same as useOrderBook/useOrders already do.

export type Ticker = {
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  markPrice: number;
  indexPrice: number | null;
  spread: number;
  fundingRatePct: number | null;
  makerFeePct: number | null;
  takerFeePct: number | null;
  maintenanceMarginRatePct: number | null;
};

type CacheEntry = Ticker & { ts: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<void>>();

function key(symbol: string, market: string): string {
  return `${symbol}:${market}`;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(s: string | undefined): number | null {
  if (s === undefined) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

async function fetchTicker(symbol: string, market: string): Promise<void> {
  const res = await getTicker(symbol, market);
  cache.set(key(symbol, market), {
    bestBid: num(res.bestBid),
    bestAsk: num(res.bestAsk),
    midPrice: num(res.midPrice),
    markPrice: num(res.markPrice),
    indexPrice: numOrNull(res.indexPrice),
    spread: num(res.spread),
    fundingRatePct: numOrNull(res.fundingRatePct),
    makerFeePct: numOrNull(res.makerFeePct),
    takerFeePct: numOrNull(res.takerFeePct),
    maintenanceMarginRatePct: numOrNull(res.maintenanceMarginRatePct),
    ts: Date.now(),
  });
}

const POLL_MS = 1000;

function fromCache(symbol: string, market: string): Ticker | null {
  const c = cache.get(key(symbol, market));
  if (!c) return null;
  const { ts, ...rest } = c;
  void ts;
  return rest;
}

/**
 * Live ticker for a backend-registered symbol/market. Returns null while
 * loading, on error, or when symbol/market is undefined (e.g. the frontend
 * symbol has no backend market — see backendMarketFor). Callers should treat
 * null as "no real data available," not as "zero," and fall back to
 * whatever mock/estimate they'd otherwise use.
 */
export function useTicker(symbol: string | undefined, market: string | undefined): Ticker | null {
  const cacheKey = symbol && market ? key(symbol, market) : undefined;
  const [tick, setTick] = useState<Ticker | null>(() =>
    symbol && market ? fromCache(symbol, market) : null
  );

  const keyRef = useRef(cacheKey);
  keyRef.current = cacheKey;

  useEffect(() => {
    if (!symbol || !market) {
      setTick(null);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      const k = key(symbol, market);
      let p = inFlight.get(k);
      if (!p) {
        p = fetchTicker(symbol, market).finally(() => inFlight.delete(k));
        inFlight.set(k, p);
      }
      try {
        await p;
      } catch {
        // Network error or symbol not registered: keep last known value (if
        // any), retry next tick. A 404 here just means no real ticker
        // exists for this symbol — expected for unregistered markets.
        return;
      }
      if (cancelled || keyRef.current !== k) return;
      const t = fromCache(symbol, market);
      if (t) setTick(t);
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, market]);

  return tick;
}
