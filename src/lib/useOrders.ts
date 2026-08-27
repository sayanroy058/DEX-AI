import { useCallback, useEffect, useRef, useState } from "react";
import { submitOrder, cancelOrder, getOrders, SubmitOrderParams } from "./apiClient";
import { wsClient, WSEvent } from "./wsClient";
import { wallet } from "./useWallet";

export type OpenOrder = {
  id: string;
  symbol: string;
  market: string;
  side: "BUY" | "SELL";
  price?: string;
  qty: string;
  filled: string;
  status: string;
  // Set only for a take-profit or stop-loss leg belonging to an attached
  // order group; empty for a regular standalone order.
  groupId?: string;
  groupRole?: "TP" | "SL";
};

const TERMINAL = new Set(["FILLED", "CANCELLED", "REJECTED"]);

export function useOrders(account: string) {
  // Authoritative state is a map keyed by order id, so HTTP snapshots, WS
  // deltas, optimistic local placements, and resync refetches all merge on the
  // same key instead of racing to append/splice a positional array. The
  // rendered array is derived from it.
  const ordersRef = useRef<Map<string, OpenOrder>>(new Map());
  const [orders, setOrders] = useState<OpenOrder[]>([]);

  const publish = useCallback(() => {
    setOrders(Array.from(ordersRef.current.values()));
  }, []);

  const applySnapshot = useCallback(
    (list: OpenOrder[]) => {
      // A full refetch is the source of truth: rebuild the map from it, but keep
      // any optimistic local order the server hasn't acknowledged yet (its id is
      // engine-assigned, so once it's in a snapshot it dedupes by id naturally).
      const next = new Map<string, OpenOrder>();
      for (const o of list) {
        if (!TERMINAL.has(o.status)) next.set(o.id, o);
      }
      ordersRef.current = next;
      publish();
    },
    [publish]
  );

  const refetch = useCallback(() => {
    if (!account) return Promise.resolve();
    return getOrders(account)
      .then((res) => applySnapshot(res.orders as OpenOrder[]))
      .catch(() => {
        /* leave last-known state in place on failure */
      });
  }, [account, applySnapshot]);

  // Initial load + reload when the account changes.
  useEffect(() => {
    ordersRef.current = new Map();
    publish();
    refetch();
  }, [account, refetch, publish]);

  // Live deltas from the WS stream.
  useEffect(() => {
    const unsub = wsClient.subscribe((evt: WSEvent) => {
      if (!evt.order) return;
      const o = evt.order;
      const map = ordersRef.current;
      if (TERMINAL.has(o.status)) {
        if (map.delete(o.id)) publish();
        return;
      }
      const existing = map.get(o.id);
      if (existing) {
        map.set(o.id, { ...existing, filled: o.filled, status: o.status });
      } else {
        // We learned about an order we didn't have (e.g. placed on another
        // device/tab). We only have partial fields from the event; refetch to
        // fill in the rest authoritatively rather than render a half-order.
        void refetch();
        return;
      }
      publish();
    });
    return unsub;
  }, [publish, refetch]);

  // A sequence gap means we dropped WS events and our local view may be stale:
  // resync from the authoritative HTTP endpoint.
  useEffect(() => {
    const unsub = wsClient.onGap(() => {
      void refetch();
    });
    return unsub;
  }, [refetch]);

  const place = useCallback(
    async (p: Omit<SubmitOrderParams, "account">) => {
      const res = await submitOrder({ ...p, account });
      if (!TERMINAL.has(res.status)) {
        ordersRef.current.set(res.orderId, {
          id: res.orderId,
          symbol: p.symbol,
          market: p.market,
          side: p.side,
          price: p.price,
          qty: p.qty,
          filled: res.filled,
          status: res.status,
        });
        publish();
      }
      wallet.refreshBalances().catch(() => {});
      return res;
    },
    [account, publish]
  );

  const cancel = useCallback(
    async (symbol: string, market: string, orderId: string) => {
      const res = await cancelOrder(symbol, market, orderId);
      if (ordersRef.current.delete(orderId)) publish();
      wallet.refreshBalances().catch(() => {});
      return res;
    },
    [publish]
  );

  return { orders, place, cancel, refetch };
}
