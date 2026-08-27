import { useEffect, useRef, useState } from "react";
import { getTicker } from "./apiClient";
import { registeredFuturesSymbols } from "./backendMarkets";
import type { Ticker } from "./useTicker";

// Batch version of useTicker for every backend-registered FUTURES symbol at
// once — used by PositionsPanel, which needs a mark price + MMR per
// position and can't know ahead of time how many distinct futures symbols
// a user's open positions span. Keyed by engine symbol (e.g. "BTC-USDC").
//
// This replaces a hardcoded MAINTENANCE_MARGIN_RATE map in backendMarkets.ts
// that was the only source for the liquidation-price preview and could
// silently drift from the real symbol_configs value.

const POLL_MS = 5000;

function toTicker(res: Awaited<ReturnType<typeof getTicker>>): Ticker {
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

  useEffect(() => {
    mountedRef.current = true;
    const symbols = registeredFuturesSymbols();
    if (symbols.length === 0) return;

    let cancelled = false;

    const pollOne = async ({ symbol, market }: { symbol: string; market: string }) => {
      try {
        const res = await getTicker(symbol, market);
        if (cancelled) return;
        setTickers((prev) => ({ ...prev, [symbol]: toTicker(res) }));
      } catch {
        // Symbol not registered or transient network error: leave whatever
        // was last known (if anything) in place, retry next tick.
      }
    };

    const pollAll = () => {
      symbols.forEach((s) => void pollOne(s));
    };

    pollAll();
    const id = setInterval(pollAll, POLL_MS);
    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearInterval(id);
    };
  }, []);

  return tickers;
}
