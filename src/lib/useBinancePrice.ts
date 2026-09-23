import { useEffect, useRef, useState } from "react";

export type BinanceTicker = {
  symbol: string;
  lastPrice: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;       // base asset volume
  quoteVolume: number;  // quote volume (USDT)
};

// Maps a base asset (e.g. "BTC") to the Binance spot ticker symbol used for
// live pricing. USDT is the most liquid quote on Binance spot and is
// treated as ~USD for display purposes.
function toBinanceTicker(base: string): string {
  return `${base.toUpperCase()}USDT`;
}

type CacheEntry = {
  lastPrice: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  ts: number;
};

// Simple in-memory cache shared across hook instances so multiple components
// showing the same symbol don't each hit Binance separately.
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<void>>();

async function fetchTicker(base: string): Promise<void> {
  const sym = toBinanceTicker(base);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`binance ticker ${res.status}`);
  const d = await res.json();
  cache.set(base, {
    lastPrice: parseFloat(d.lastPrice),
    changePercent: parseFloat(d.priceChangePercent),
    high: parseFloat(d.highPrice),
    low: parseFloat(d.lowPrice),
    volume: parseFloat(d.volume),
    quoteVolume: parseFloat(d.quoteVolume),
    ts: Date.now(),
  });
}

// Poll interval: 5 seconds. Binance spot 24hr ticker is fine for this rate.
const POLL_MS = 5000;

export function useBinancePrice(base: string | undefined): BinanceTicker | null {
  const [tick, setTick] = useState<BinanceTicker | null>(() => {
    if (!base) return null;
    const c = cache.get(base);
    return c
      ? {
          symbol: toBinanceTicker(base),
          lastPrice: c.lastPrice,
          changePercent: c.changePercent,
          high: c.high,
          low: c.low,
          volume: c.volume,
          quoteVolume: c.quoteVolume,
        }
      : null;
  });

  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    if (!base) {
      setTick(null);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      // Reuse any in-flight request for the same base.
      let p = inFlight.get(base);
      if (!p) {
        p = fetchTicker(base).finally(() => inFlight.delete(base));
        inFlight.set(base, p);
      }
      try {
        await p;
      } catch {
        // Network or rate-limit error: keep last known value, retry next tick.
        return;
      }
      if (cancelled || baseRef.current !== base) return;
      const c = cache.get(base);
      if (!c) return;
      setTick({
        symbol: toBinanceTicker(base),
        lastPrice: c.lastPrice,
        changePercent: c.changePercent,
        high: c.high,
        low: c.low,
        volume: c.volume,
        quoteVolume: c.quoteVolume,
      });
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
