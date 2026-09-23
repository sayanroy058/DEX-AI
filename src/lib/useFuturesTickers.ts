import { useEffect, useRef, useState } from "react";
import { getTicker } from "./apiClient";
import { registeredFuturesSymbols } from "./backendMarkets";
import { wsClient, WSTicker } from "./wsClient";
import type { Ticker } from "./useTicker";

// Batch version of useTicker for every backend-registered FUTURES symbol at
// once — used by PositionsPanel, which needs a mark price + MMR per
// position and can't know ahead of time how many distinct futures symbols
// a user's open positions span. Keyed by engine symbol (e.g. "BTC-USDC").
//
// PRIMARY SOURCE is the engine's periodic TICKER WebSocket frame (1s, all
// symbols in ONE frame — Binance's !ticker@arr pattern) via wsClient's shared
// store: zero per-symbol HTTP requests while the socket is up. The old
// per-symbol /ticker fan-out (one request per futures symbol every 5s) is
// now only the bootstrap + fallback path, and it pauses entirely while the
// WS feed is delivering.

const FALLBACK_POLL_MS = 5000;

function toTickerFromREST(res: Awaited<ReturnType<typeof getTicker>>): Ticker {
  const num = (s: string | undefined) => {
    if (!s) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  return {
    bestBid: num(res.bestBid) ?? 0,
    bestAsk: num(res.bestAsk) ?? 0,
    midPrice: num(res.midPrice) ?? 0,
    markPrice: num(res.markPrice) ?? 0,
    indexPrice: num(res.indexPrice),
    spread: num(res.spread) ?? 0,
    fundingRatePct: num(res.fundingRatePct),
    makerFeePct: num(res.makerFeePct),
    takerFeePct: num(res.takerFeePct),
    maintenanceMarginRatePct: num(res.maintenanceMarginRatePct),
  };
}

function toTickerFromWS(t: WSTicker): Ticker {
  const num = (s: string | undefined) => {
    if (!s) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  return {
    bestBid: num(t.bestBid) ?? 0,
    bestAsk: num(t.bestAsk) ?? 0,
    midPrice: num(t.midPrice) ?? 0,
    markPrice: num(t.markPrice) ?? 0,
    indexPrice: num(t.indexPrice),
    spread: num(t.spread) ?? 0,
    fundingRatePct: num(t.fundingRatePct),
    makerFeePct: num(t.makerFeePct),
    takerFeePct: num(t.takerFeePct),
    maintenanceMarginRatePct: num(t.maintenanceMarginRatePct),
  };
}

/**
 * Live tickers for every registered futures symbol, keyed by engine symbol
 * (e.g. { "BTC-USDC": Ticker, "ETH-USDC": Ticker }). A symbol only appears
 * once its first successful fetch resolves; until then (or on persistent
 * error) it's simply absent from the map — callers should treat a missing
 * key as "no real data," not "zero."
 */
export function useFuturesTickers(): Record<string, Ticker> {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const mountedRef = useRef(true);

  // Primary: WS TICKER frames. One listener covers every futures symbol.
  useEffect(() => {
    mountedRef.current = true;
    const symbols = registeredFuturesSymbols();
    if (symbols.length === 0) return;

    const applyFromStore = (store: Map<string, WSTicker>) => {
      if (!mountedRef.current) return;
      setTickers((prev) => {
        let next: Record<string, Ticker> | null = null;
        for (const { symbol, market } of symbols) {
          const t = store.get(`${symbol}|${market}`);
          if (!t) continue;
          const converted = toTickerFromWS(t);
          if (JSON.stringify(prev[symbol]) !== JSON.stringify(converted)) {
            if (!next) next = { ...prev };
            next[symbol] = converted;
          }
        }
        return next ?? prev;
      });
    };

    const unsub = wsClient.subscribeTickers(applyFromStore);
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  // Fallback: the old per-symbol poll, only while WS is not delivering.
  useEffect(() => {
    const symbols = registeredFuturesSymbols();
    if (symbols.length === 0) return;

    const pollOne = async ({ symbol, market }: { symbol: string; market: string }) => {
      try {
        const res = await getTicker(symbol, market);
        setTickers((prev) => ({ ...prev, [symbol]: toTickerFromREST(res) }));
      } catch {
        // Symbol not registered or transient network error: leave whatever
        // was last known (if anything) in place, retry next tick.
      }
    };

    const id = setInterval(() => {
      if (wsClient.getStatus() === "open" && wsClient.getTickers().size > 0) return;
      symbols.forEach((s) => void pollOne(s));
    }, FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return tickers;
}
