import { useEffect, useState, useCallback } from "react";
import { getDepth, getTrades } from "./apiClient";
import { wsClient, WSEvent } from "./wsClient";
import type { OrderBookLevel, Trade } from "./mockData";

function toLevel(d: { price: string; size: string; total: string }): OrderBookLevel {
  return { price: Number(d.price), size: Number(d.size), total: Number(d.total) };
}

export function useOrderBook(symbol: string, market: string, levels = 20) {
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);

  const refresh = useCallback(() => {
    getDepth(symbol, market, levels)
      .then((res) => {
        setBids(res.bids.map(toLevel));
        setAsks(res.asks.map(toLevel));
      })
      .catch(() => {});
  }, [symbol, market, levels]);

  useEffect(() => {
    refresh();
    const unsub = wsClient.subscribe((evt: WSEvent) => {
      if (evt.symbol === symbol && evt.market === market) refresh();
    });
    return unsub;
  }, [symbol, market, refresh]);

  return { bids, asks };
}

export function useRecentTrades(symbol: string, market: string, limit = 30) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTrades(symbol, market, limit)
      .then((res) => {
        if (cancelled) return;
        setTrades(
          res.trades.map((t) => ({
            id: t.id,
            price: Number(t.price),
            size: Number(t.quantity),
            side: t.side === "BUY" ? "buy" : "sell",
            time: t.timestamp,
          }))
        );
      })
      .catch(() => {});

    const unsub = wsClient.subscribe((evt: WSEvent) => {
      if (evt.type !== "TRADE" || !evt.trade) return;
      if (evt.symbol !== symbol || evt.market !== market) return;
      const t = evt.trade;
      const takerSide = t.makerSide === "BUY" ? "sell" : "buy";
      setTrades((prev) =>
        [
          {
            id: t.id,
            price: Number(t.price),
            size: Number(t.quantity),
            side: takerSide as "buy" | "sell",
            time: new Date(t.executedAt).getTime(),
          },
          ...prev,
        ].slice(0, limit)
      );
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [symbol, market, limit]);

  return trades;
}
