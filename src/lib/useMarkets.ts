import { useEffect, useState } from "react";
import { INITIAL_MARKETS, Market, tickPrice } from "./mockData";
import { backendMarketFor, frontendSymbolFor } from "./backendMarkets";
import { getAllMarketSummaries } from "./apiClient";
import { wsClient, WSTicker } from "./wsClient";

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

// Apply one engine ticker to the matching frontend market row (if any).
// Returns true when a row changed, so callers can decide whether to publish.
function applyTicker(t: WSTicker): boolean {
  const frontendSymbol = frontendSymbolFor(t.symbol, t.market);
  if (!backendMarketFor(frontendSymbol)) return false;
  const price = Number(t.markPrice || t.midPrice);
  const updatedAt = Date.now();
  if (!Number.isFinite(price) || price <= 0) return false;
  let changed = false;
  markets = markets.map(m => {
    if (m.symbol !== frontendSymbol) return m;
    const change24h = t.has24hData ? Number(t.change24hPct ?? 0) : 0;
    const volume24h = t.has24hData ? Number(t.volume24h ?? 0) : 0;
    if (m.price === price && m.change24h === change24h && m.volume24h === volume24h && m.dataStatus === "live") {
      return m;
    }
    changed = true;
    return {
      ...m,
      price,
      change24h,
      volume24h,
      dataStatus: "live" as const,
      updatedAt,
    };
  });
  return changed;
}

// One batched refresh of every executable market from the engine's batched
// /market-summary response (or the WS ticker store when it has data). The old
// shape — one HTTP request PER market every 5s — was the trade page's largest
// source of request churn.
async function refreshExecutableMarkets() {
  const executable = markets.filter(m => backendMarketFor(m.symbol));
  if (executable.length === 0) return;

  // Prefer the WS ticker store when the socket is delivering: no HTTP at all.
  const store = wsClient.getTickers();
  if (wsClient.getStatus() === "open" && store.size > 0) {
    let changed = false;
    for (const t of store.values()) changed = applyTicker(t) || changed;
    if (changed) publish();
    return;
  }

  try {
    const summaries = await getAllMarketSummaries();
    let changed = false;
    markets = markets.map(m => {
      const backend = backendMarketFor(m.symbol);
      if (!backend) return m;
      const s = summaries.find(
        x => x.symbol === backend.symbol && x.market === backend.market
      );
      if (!s) return m;
      const price = Number(s.price);
      const updatedAt = Date.parse(s.updatedAt);
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(updatedAt)) {
        // Retain the last genuine engine value but clearly mark it stale;
        // never replace it with a simulated or external value.
        return m.dataStatus === "live" ? { ...m, dataStatus: "stale" as const } : m;
      }
      const next = {
        ...m,
        price,
        change24h: s.has24hData ? Number(s.change24hPct ?? 0) : 0,
        volume24h: s.has24hData ? Number(s.volume24h ?? 0) : 0,
        dataStatus: "live" as const,
        updatedAt,
      };
      if (next.price !== m.price || next.dataStatus !== m.dataStatus) changed = true;
      return next;
    });
    if (changed) publish();
  } catch {
    markets = markets.map(m => {
      if (!backendMarketFor(m.symbol)) return m;
      // Retain the last genuine engine value but clearly mark it stale;
      // never replace it with a simulated or external value.
      if (m.dataStatus === "live") return { ...m, dataStatus: "stale" as const };
      return { ...m, dataStatus: "unavailable" as const };
    });
    publish();
  }
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
  // Live executable-market prices arrive via the WS TICKER frame (1s, all
  // symbols); the batched HTTP refresh is the bootstrap + fallback only.
  wsClient.subscribeTickers(store => {
    let changed = false;
    for (const t of store.values()) changed = applyTicker(t) || changed;
    if (changed) publish();
  });
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
