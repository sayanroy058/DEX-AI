import { useEffect, useState } from "react";
import { INITIAL_MARKETS, Market, tickPrice } from "./mockData";

// Singleton-style hook that simulates a websocket price feed
let listeners: Set<(m: Market[]) => void> = new Set();
let markets: Market[] = INITIAL_MARKETS.map(m => ({ ...m }));
let interval: ReturnType<typeof setInterval> | null = null;

function start() {
  if (interval) return;
  interval = setInterval(() => {
    markets = markets.map(m => {
      const newPrice = tickPrice(m.price, m.category === "perp" ? 0.0012 : 0.0008);
      const change = m.change24h + (newPrice - m.price) / m.price * 100;
      return { ...m, price: newPrice, change24h: change };
    });
    listeners.forEach(l => l(markets));
  }, 1500);
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
