import { useEffect, useState } from "react";
import { INITIAL_MARKETS, Market, tickPrice } from "./mockData";
import { backendMarketFor } from "./backendMarkets";
import { getMarketSummary } from "./apiClient";

// Singleton-style hook that simulates a websocket price feed
let listeners: Set<(m: Market[]) => void> = new Set();
let markets: Market[] = INITIAL_MARKETS.map(m => ({ ...m }));
let simulationInterval: ReturnType<typeof setInterval> | null = null;
let summaryInterval: ReturnType<typeof setInterval> | null = null;

function publish() {
  listeners.forEach(l => l(markets));
}

function setExecutableMarketsUnavailable() {
  markets = markets.map(m => backendMarketFor(m.symbol)
    ? { ...m, price: 0, change24h: 0, volume24h: 0, dataStatus: "unavailable" as const, updatedAt: undefined }
    : m
  );
}

async function refreshExecutableMarkets() {
  const executable = markets.filter(m => backendMarketFor(m.symbol));
  await Promise.all(executable.map(async (market) => {
    const backend = backendMarketFor(market.symbol)!;
    try {
      const summary = await getMarketSummary(backend.symbol, backend.market);
      const price = Number(summary.price);
      const updatedAt = Date.parse(summary.updatedAt);
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(updatedAt)) {
        throw new Error("market summary is unavailable");
      }
      markets = markets.map(m => m.symbol !== market.symbol ? m : {
        ...m,
        price,
        change24h: summary.has24hData ? Number(summary.change24hPct ?? 0) : 0,
        volume24h: summary.has24hData ? Number(summary.volume24h ?? 0) : 0,
        dataStatus: "live" as const,
        updatedAt,
      });
    } catch {
      markets = markets.map(m => {
        if (m.symbol !== market.symbol) return m;
        // Retain the last genuine engine value but clearly mark it stale;
        // never replace it with a simulated or external value.
        if (m.dataStatus === "live") return { ...m, dataStatus: "stale" as const };
        return { ...m, dataStatus: "unavailable" as const };
      });
    }
  }));
  publish();
}

function start() {
  if (simulationInterval) return;
  setExecutableMarketsUnavailable();
  // Preserve the existing simulated display behavior only for assets that are
  // not yet part of the current five-market execution rollout.
  simulationInterval = setInterval(() => {
    markets = markets.map(m => {
      if (backendMarketFor(m.symbol)) return m;
      const newPrice = tickPrice(m.price, m.category === "perp" ? 0.0012 : 0.0008);
      const change = m.change24h + (newPrice - m.price) / m.price * 100;
      return { ...m, price: newPrice, change24h: change };
    });
    publish();
  }, 1500);
  void refreshExecutableMarkets();
  summaryInterval = setInterval(() => { void refreshExecutableMarkets(); }, 5000);
}

export function useMarkets() {
  const [data, setData] = useState<Market[]>(markets);
  useEffect(() => {
    start();
    listeners.add(setData);
    return () => { listeners.delete(setData); };
  }, []);
  return data;
}

export function useMarket(symbol: string) {
  const all = useMarkets();
  return all.find(m => m.symbol === symbol);
}
