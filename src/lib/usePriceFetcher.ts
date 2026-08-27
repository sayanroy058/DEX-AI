import { useEffect, useState } from "react";

// Fetches straight from the hosted price-fetcher's /healthz endpoint, no
// backend in between. Covers BTC/ETH/SOL/BNB (crypto), EURUSD/GBPUSD/AUDUSD
// (forex), GOLD/SILVER/CrudeOIL (commodity), and AAPL.us/TSLA.us/NVDA.us
// (stocks) — see mockData.ts for the full list this service tracks.
const PRICE_FETCHER_URL = "https://price-fetcher-api.onrender.com/healthz";

export type PriceFetcherAsset = {
  last: number;
  updatedAt: string;
  ageMs: number;
};

type HealthzResponse = {
  ok: boolean;
  assets: Record<string, { last: number; updated_at: string; age_ms: number }>;
};

let assets: Record<string, PriceFetcherAsset> = {};
let listeners: Set<(a: Record<string, PriceFetcherAsset>) => void> = new Set();
let started = false;

async function refresh() {
  try {
    const res = await fetch(PRICE_FETCHER_URL);
    if (!res.ok) return;
    const data: HealthzResponse = await res.json();
    const next: Record<string, PriceFetcherAsset> = {};
    for (const [symbol, a] of Object.entries(data.assets ?? {})) {
      next[symbol] = { last: a.last, updatedAt: a.updated_at, ageMs: a.age_ms };
    }
    assets = next;
    listeners.forEach((l) => l(assets));
  } catch {
    // Network error / render.com cold start: keep last known values, retry
    // on the next poll.
  }
}

const POLL_MS = 2000;

function start() {
  if (started) return;
  started = true;
  refresh();
  setInterval(refresh, POLL_MS);
}

/** Every asset currently reported by price-fetcher's /healthz, keyed by its symbol (e.g. "BTC", "AAPL.us"). */
export function usePriceFetcherAssets(): Record<string, PriceFetcherAsset> {
  const [data, setData] = useState(assets);
  useEffect(() => {
    start();
    listeners.add(setData);
    return () => { listeners.delete(setData); };
  }, []);
  return data;
}

/** A single asset's last price from price-fetcher, or null if not (yet) available. */
export function usePriceFetcherPrice(symbol: string | undefined): PriceFetcherAsset | null {
  const all = usePriceFetcherAssets();
  if (!symbol) return null;
  return all[symbol] ?? null;
}
