import { useEffect, useRef, useState } from "react";
import { getTicker } from "./apiClient";
import { wsClient, WSTicker } from "./wsClient";

// The engine's real /ticker: order-book-derived bid/ask/mid/mark, plus
// (for FUTURES) the underlying's index price, the funding rate that would
// apply at the next settlement, and the real fee/MMR config — all previously
// either fabricated (mark = price*1.0001, index = price*0.9999) or hardcoded
// client-side (fee rates, MMR). Only meaningful for symbols actually
// registered on the backend; callers should fall back to the mock market
// feed for anything else, same as useOrderBook/useOrders already do.
//
// PRIMARY SOURCE is the engine's periodic TICKER WebSocket frame (1s, all
// symbols in one frame) via wsClient's shared ticker store — zero HTTP while
// the socket is up, no matter how many components use this hook. The HTTP
// /ticker endpoint remains only as the bootstrap + fallback path (initial
// fetch, and a slow poll that pauses while the WS feed is delivering).

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

// Convert a TICKER WS frame entry (strings) into this hook's numeric shape.
function fromWSTicker(t: WSTicker): Ticker {
  return {
    bestBid: num(t.bestBid),
    bestAsk: num(t.bestAsk),
    midPrice: num(t.midPrice),
    markPrice: num(t.markPrice),
    indexPrice: numOrNull(t.indexPrice),
    spread: num(t.spread),
    fundingRatePct: numOrNull(t.fundingRatePct),
    makerFeePct: numOrNull(t.makerFeePct),
    takerFeePct: numOrNull(t.takerFeePct),
    maintenanceMarginRatePct: numOrNull(t.maintenanceMarginRatePct),
  };
}

function fromREST(res: Awaited<ReturnType<typeof getTicker>>): Ticker {
  return {
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
  };
}

async function fetchTicker(symbol: string, market: string): Promise<void> {
  const res = await getTicker(symbol, market);
  cache.set(key(symbol, market), { ...fromREST(res), ts: Date.now() });
}

// Fallback cadence. While the WS feed is delivering, the poll does nothing —
// the TICKER frame refreshes this data every second already.
const FALLBACK_POLL_MS = 10_000;

function fromCache(symbol: string, market: string): Ticker | null {
  const c = cache.get(key(symbol, market));
  if (!c) return null;
  const { ts, ...rest } = c;
  void ts;
  return rest;
}

/** True when the shared WS ticker store already has fresh data for this
 *  symbol/market — used to suspend the HTTP fallback poll. */
function wsHasTicker(symbol: string, market: string): boolean {
  return wsClient.getStatus() === "open" && wsClient.getTickers().has(`${symbol}|${market}`);
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

  // WS-driven updates: fires on every 1s TICKER frame.
  useEffect(() => {
    if (!symbol || !market) {
      setTick(null);
      return;
    }
    const applyFromStore = (store: Map<string, WSTicker>) => {
      const t = store.get(`${symbol}|${market}`);
      if (!t) return;
      const converted = fromWSTicker(t);
      cache.set(key(symbol, market), { ...converted, ts: Date.now() });
      if (keyRef.current === key(symbol, market)) setTick(converted);
    };
    return wsClient.subscribeTickers(applyFromStore);
  }, [symbol, market]);

  // HTTP fallback: initial bootstrap fetch + slow poll that only runs while
  // the WS feed is not delivering (disconnected, or engine without the
  // TICKER broadcaster).
  useEffect(() => {
    if (!symbol || !market) return;
    let cancelled = false;

    const fetchAndApply = async () => {
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
        // any). A 404 here just means no real ticker exists for this
        // symbol — expected for unregistered markets.
        return;
      }
      if (cancelled || keyRef.current !== k) return;
      const t = fromCache(symbol, market);
      if (t) setTick(t);
    };

    void fetchAndApply();
    const id = setInterval(() => {
      if (wsHasTicker(symbol, market)) return;
      void fetchAndApply();
    }, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, market]);

  return tick;
}
