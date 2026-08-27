import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarkets } from "@/lib/useMarkets";
import { formatPrice } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, Sparkles, X } from "lucide-react";
import { getPositions, getOrderHistory, getFills, getFundingHistory, getPnlHistory, FuturesPositionDTO, OptionsPositionDTO, OrderHistoryDTO, FillDTO, RealizedPnlDTO } from "@/lib/apiClient";
import { frontendSymbolFor } from "@/lib/backendMarkets";
import { useFuturesTickers } from "@/lib/useFuturesTickers";
import { useOrders } from "@/lib/useOrders";
import { useWallet } from "@/lib/useWallet";
import { wsClient, WSEvent } from "@/lib/wsClient";
import { getMyBots, Bot as BotDTO } from "@/lib/botsApi";
import { toast } from "sonner";

type FundingEntry = {
  time: string;
  symbol: string;
  rate: string;
  payment: number;
  // Set for rows loaded from the persisted REST history, used to avoid
  // double-counting a WS event for the same payment right after a fetch.
  key?: string;
};


// Strategy keys are raw identifiers from the bots service (e.g.
// "futures_dca", not "Futures DCA") — mirrors strategy.Templates() in
// bots/internal/strategy/strategy.go. Humanized for display only.
const STRATEGY_LABELS: Record<string, string> = {
  spot_grid: "Spot Grid",
  futures_grid: "Futures Grid",
  spot_dca: "Spot DCA",
  futures_dca: "Futures DCA",
  futures_twap: "Futures TWAP",
  arbitrage: "Arbitrage",
  market_maker: "Market Maker",
};

export function humanizeStrategy(key: string): string {
  return STRATEGY_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type BotStatusDisplay = { label: string; tone: "buy" | "primary" | "warning" | "muted" | "sell" };

export function botStatusDisplay(bot: BotDTO): BotStatusDisplay {
  if (bot.status === "error") return { label: "Error", tone: "sell" };
  if (bot.isRunning) return { label: "Running", tone: "buy" };
  if (bot.status === "paused") return { label: "Paused", tone: "warning" };
  if (bot.status === "draft") return { label: "Draft", tone: "muted" };
  return { label: "Stopped", tone: "muted" };
}

// resolveMarkPrice picks the mark price a position's PnL/liquidation
// preview is computed against, in priority order:
//   1. The real engine ticker's mark price, whenever it's actually usable
//      (> 0 — an empty order book still returns a 200 with markPrice "0",
//      which isn't a real quote to compute PnL against).
//   2. The position DTO's own markPrice (also real backend data, just a
//      possibly-stale snapshot from when /positions was last fetched).
//   3. The client-side mock market feed's price, as a last resort only.
// Exported and pulled out of the component specifically so this priority
// order is independently testable: previously step 3 ran FIRST, so a real
// open position's displayed PnL could silently be computed against a
// fabricated price even while the real value was sitting right there in
// the position DTO.
export function resolveMarkPrice(
  tickerMarkPrice: number | undefined,
  positionMarkPrice: string,
  mockMarketPrice: number | undefined
): number {
  if (tickerMarkPrice !== undefined && tickerMarkPrice > 0) return tickerMarkPrice;
  const fromPosition = parseFloat(positionMarkPrice);
  if (fromPosition > 0) return fromPosition;
  return mockMarketPrice ?? 0;
}

export function PositionsPanel({
  markets,
  account,
  orders,
}: {
  markets: ReturnType<typeof useMarkets>;
  account: string;
  orders: ReturnType<typeof useOrders>;
}) {
  const [futuresPositions, setFuturesPositions] = useState<FuturesPositionDTO[]>([]);
  const [optionsPositions, setOptionsPositions] = useState<OptionsPositionDTO[]>([]);
  const [fundingHistory, setFundingHistory] = useState<FundingEntry[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryDTO[]>([]);
  const [fills, setFills] = useState<FillDTO[]>([]);
  const [realizedPnl, setRealizedPnl] = useState<RealizedPnlDTO[]>([]);
  const [closing, setClosing] = useState<string | null>(null);
  const futuresTickers = useFuturesTickers();
  const [myBots, setMyBots] = useState<BotDTO[]>([]);
  const [botsAuthed, setBotsAuthed] = useState(true);

  const futuresOrders = orders.orders.filter(o => o.market === "FUTURES");
  const optionsOrders = orders.orders.filter(o => o.market === "OPTIONS");
  const spotOrders = orders.orders.filter(o => o.market === "SPOT");
  const walletState = useWallet();

  const refetchPositions = useCallback(() => {
    if (!account) return;
    getPositions(account)
      .then((res) => {
        setFuturesPositions(res.futures ?? []);
        setOptionsPositions(res.options ?? []);
      })
      .catch(() => {});
  }, [account]);

  // Persisted funding history (survives refresh/reconnect/another device) —
  // previously this tab was WS-only and its state was wiped on every
  // refresh even though funding payments were already durably stored.
  useEffect(() => {
    if (!account) return;
    getFundingHistory({ limit: 50 })
      .then((res) => {
        const rows: FundingEntry[] = (res.payments ?? []).map((p) => ({
          key: `${p.symbol}:${p.createdAt}`,
          time: new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          symbol: p.symbol,
          rate: (parseFloat(p.rate) * 100).toFixed(4) + "%",
          payment: parseFloat(p.amount),
        }));
        setFundingHistory(rows);
      })
      .catch(() => {});
  }, [account]);

  useEffect(() => {
    const unsub = wsClient.subscribe((evt: WSEvent) => {
      if (evt.type !== "FUNDING" || !evt.funding) return;
      const entry: FundingEntry = {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        symbol: evt.funding.symbol,
        rate: (parseFloat(evt.funding.rate) * 100).toFixed(4) + "%",
        payment: parseFloat(evt.funding.payment),
      };
      // Live delta: prepend unconditionally. A duplicate against the most
      // recent REST-loaded row (same symbol/payment landing within the same
      // fetch-then-WS race) is a display-only edge case, not a correctness
      // issue — the persisted history from the next refresh is authoritative.
      setFundingHistory((prev) => [entry, ...prev].slice(0, 50));
    });
    return unsub;
  }, []);

  const handleCancel = async (symbol: string, market: string, orderId: string) => {
    try {
      await orders.cancel(symbol, market, orderId);
      toast.success("Order cancelled");
    } catch (err) {
      toast.error("Cancel failed", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleClose = async (p: { symbol: string; side: "long" | "short"; size: number }) => {
    setClosing(p.symbol);
    try {
      // Close = opposing MARKET order that reduces the position. It only
      // reduces if there is opposing liquidity in the book, so inspect the
      // actual fill instead of assuming success.
      const res = await orders.place({
        symbol: p.symbol,
        market: "FUTURES",
        side: p.side === "long" ? "SELL" : "BUY",
        type: "MARKET",
        qty: String(p.size),
        reduceOnly: true,
      });
      const filled = parseFloat(res.filled || "0");
      if (filled <= 0) {
        toast.error("Position not closed", {
          description: "No opposing liquidity in the order book to fill the close. Try again or place a limit order.",
        });
      } else if (filled < p.size) {
        toast.warning("Position partially closed", {
          description: `Filled ${filled} of ${p.size}. Remainder still open.`,
        });
      } else {
        toast.success("Position closed");
      }
      // Reflect the new position state immediately regardless of outcome.
      refetchPositions();
    } catch (err) {
      toast.error("Close failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setClosing(null);
    }
  };

  useEffect(() => {
    if (!account) {
      // Wallet is connected but the backend userId hasn't resolved yet
      // (see useAccount) - wait rather than fetching/displaying stale or
      // wrong-account positions.
      setFuturesPositions([]);
      setOptionsPositions([]);
      return;
    }
    let cancelled = false;
    const fetchPositions = () => {
      getPositions(account)
        .then((res) => {
          if (cancelled) return;
          setFuturesPositions(res.futures ?? []);
          setOptionsPositions(res.options ?? []);
        })
        .catch(() => {
          if (!cancelled) {
            setFuturesPositions([]);
            setOptionsPositions([]);
          }
        });
    };
    fetchPositions();
    // 5s poll stays as a safety net (catches liquidations and anything else
    // that changes a position without a WS event this panel listens for),
    // but the primary signal is now the WS stream: an own-account order fill
    // or funding payment refetches immediately, so a position typically
    // updates within milliseconds of the fill instead of waiting up to 5s.
    const interval = setInterval(fetchPositions, 5000);
    const unsubWs = wsClient.subscribe((evt: WSEvent) => {
      // The order-fill stream is a symbol-wide broadcast, not scoped to
      // this account (the engine doesn't tag WS events with an account ID
      // for order fills — only FUNDING carries accountId) — so this can
      // trigger on someone else's fill too. That's a harmless extra
      // getPositions() call (still correctly account-scoped server-side),
      // not a correctness issue, and it's the best signal available without
      // adding a new backend event type just for this.
      const isFillOnFuturesSymbol =
        (evt.type === "ORDER_FILLED" || evt.type === "ORDER_PARTIALLY_FILLED") &&
        evt.market === "FUTURES";
      const isOwnFunding = evt.type === "FUNDING" && evt.funding?.accountId === account;
      if (isFillOnFuturesSymbol || isOwnFunding) fetchPositions();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubWs();
    };
  }, [account]);

  useEffect(() => { if (account) getOrderHistory().then(r => setOrderHistory(r.orders ?? [])).catch(() => setOrderHistory([])); }, [account]);
  useEffect(() => { if (account) getFills().then(r => setFills(r.fills ?? [])).catch(() => setFills([])); }, [account]);
  useEffect(() => { if (account) getPnlHistory().then(r => setRealizedPnl(r.entries ?? [])).catch(() => setRealizedPnl([])); }, [account]);

  // Bot / AI Agent tab: the account's own strategy bots (grid/DCA/TWAP/
  // market-maker) from the bots service, replacing 4 hardcoded fake rows
  // that always showed regardless of which wallet was connected. Same
  // poll-every-5s + 401-detection pattern as TradingBots.tsx, since this
  // is the same authed endpoint (GET /bots, cookie-scoped to the account).
  useEffect(() => {
    if (!account) {
      setMyBots([]);
      return;
    }
    let cancelled = false;
    const fetchBots = () => {
      getMyBots()
        .then((res) => {
          if (cancelled) return;
          setMyBots(res.bots ?? []);
          setBotsAuthed(true);
        })
        .catch((e) => {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : "";
          if (/401|unauthorized|not authenticated/i.test(msg)) {
            setBotsAuthed(false);
            setMyBots([]);
          }
          // Other errors (network, 5xx): keep whatever was last loaded
          // rather than clearing the table on a transient failure.
        });
    };
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [account]);

  const positions = useMemo(() => {
    return futuresPositions.map(p => {
      const size = parseFloat(p.size);
      const entry = parseFloat(p.entryPrice);
      const displaySymbol = frontendSymbolFor(p.symbol, "FUTURES");
      const ticker = futuresTickers[p.symbol];
      const mockMarketPrice = markets.find(mk => mk.symbol === displaySymbol)?.price;
      const mark = resolveMarkPrice(ticker?.markPrice, p.markPrice, mockMarketPrice);
      const side = p.side === "BUY" ? "long" as const : "short" as const;
      const leverage = p.leverage || 1;
      const margin = parseFloat(p.margin);
      const direction = side === "long" ? 1 : -1;
      const pnl = (mark - entry) * size * direction;
      const pnlPct = margin !== 0 ? (pnl / margin) * 100 : 0;
      // Liquidation price derived from the backend's MarginRatio < MMR rule:
      //   long:  liq = entry * (1 - 1/lev) / (1 - MMR)
      //   short: liq = entry * (1 + 1/lev) / (1 - MMR)
      // MMR comes from the real ticker (symbol_configs) when available;
      // 0.005 (0.5%, the standard crypto perp rate) is a last-resort
      // fallback only, not the primary source anymore.
      const mmr = (ticker?.maintenanceMarginRatePct ?? 0.5) / 100;
      const liq = side === "long"
        ? (entry * (1 - 1 / leverage)) / (1 - mmr)
        : (entry * (1 + 1 / leverage)) / (1 + mmr);
      return { symbol: p.symbol, side, size, entry, leverage, margin, mark, pnl, pnlPct, liq, direction };
    });
  }, [futuresPositions, markets, futuresTickers]);

  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="glass rounded-b-xl rounded-t-none h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="positions" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
            <TabsList className="h-9 w-max bg-transparent p-0 gap-1">
              <TabsTrigger value="positions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Position <span className="ml-1.5 px-1.5 py-0.5 rounded bg-primary/20 text-[10px]">{positions.length}</span>
              </TabsTrigger>
              <TabsTrigger value="holdings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Holdings</TabsTrigger>
              <TabsTrigger value="futuresOrders" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Futures Orders <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-[10px]">{futuresOrders.length}</span>
              </TabsTrigger>
              <TabsTrigger value="optionsOrders" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Options Orders <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-[10px]">{optionsOrders.length}</span>
              </TabsTrigger>
              <TabsTrigger value="automated" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Bot / AI Agent <span className="ml-1.5 px-1.5 py-0.5 rounded bg-secondary/15 text-secondary text-[10px]">{myBots.length}</span>
              </TabsTrigger>
              <TabsTrigger value="trades" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Trade History</TabsTrigger>
              <TabsTrigger value="funding" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Funding History</TabsTrigger>
              <TabsTrigger value="realizedPnl" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Realized PnL</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Order History</TabsTrigger>
            </TabsList>
          </div>
          <div className="shrink-0 text-[11px] text-muted-foreground">
            Total PnL: <span className={cn("font-mono font-bold", totalPnl >= 0 ? "text-buy" : "text-sell")}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          </div>
        </div>

        <TabsContent value="positions" className="flex-1 overflow-auto m-0">
          <table className="w-full text-[11px] font-mono">
            <thead className="text-[10px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-1.5">Symbol</th>
                <th className="text-left">Side</th>
                <th className="text-right">Size</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Mark</th>
                <th className="text-right">Liq.</th>
                <th className="text-right">Margin</th>
                <th className="text-right">PnL</th>
                <th className="text-right pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.symbol} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2 font-sans font-semibold">{p.symbol} <span className="text-[9px] text-muted-foreground">{p.leverage}x</span></td>
                  <td className={p.side === "long" ? "text-buy" : "text-sell"}>{p.side.toUpperCase()}</td>
                  <td className="text-right">{p.size}</td>
                  <td className="text-right">{formatPrice(p.entry)}</td>
                  <td className="text-right">{formatPrice(p.mark)}</td>
                  <td className="text-right text-warning">{formatPrice(p.liq)}</td>
                  <td className="text-right">${p.margin.toFixed(2)}</td>
                  <td className={cn("text-right font-bold", p.pnl >= 0 ? "text-buy" : "text-sell")}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    <div className="text-[9px] opacity-70">{p.pnl >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%</div>
                  </td>
                  <td className="text-right pr-3">
                    <Button size="sm" variant="ghost" disabled={closing === p.symbol}
                      className="h-6 text-[10px] text-sell hover:bg-sell/10 disabled:opacity-50"
                      onClick={() => handleClose(p)}>{closing === p.symbol ? "Closing…" : "Close"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {optionsPositions.length > 0 && (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Symbol</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Strike</th>
                  <th className="text-right">Expiry</th>
                  <th className="text-right">Size</th>
                  <th className="text-right pr-3">Premium</th>
                </tr>
              </thead>
              <tbody>
                {optionsPositions.map(p => (
                  <tr key={`${p.symbol}-${p.strikePrice}-${p.expiry}-${p.optionType}`} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2 font-sans font-semibold">{p.symbol}</td>
                    <td className={p.optionType === "CALL" ? "text-buy" : "text-sell"}>{p.optionType}</td>
                    <td className="text-right">{formatPrice(parseFloat(p.strikePrice))}</td>
                    <td className="text-right">{new Date(p.expiry).toLocaleDateString()}</td>
                    <td className="text-right">{p.size}</td>
                    <td className="text-right pr-3">${parseFloat(p.premium).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="holdings" className="flex-1 overflow-auto m-0">
          <table className="w-full text-[11px] font-mono">
            <thead className="text-[10px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-1.5">Asset</th>
                <th className="text-right">Total</th>
                <th className="text-right">Available</th>
                <th className="text-right">Order-Reserved</th>
                <th className="text-right pr-3">Withdrawal-Locked</th>
              </tr>
            </thead>
            <tbody>
              {walletState.balances.map((b) => (
                <tr key={b.asset} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2 font-sans font-semibold">{b.asset}</td>
                  <td className="text-right">{b.amount.toFixed(4)}</td>
                  <td className="text-right text-buy">{b.available.toFixed(4)}</td>
                  <td className="text-right text-muted-foreground">{b.tradingLocked.toFixed(4)}</td>
                  <td className="text-right pr-3 text-muted-foreground">{b.withdrawalLocked.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-border/50 mt-2 pt-2 px-3 pb-3">
            <div className="text-[10px] text-muted-foreground uppercase mb-1.5">
              Spot open orders reserving balance ({spotOrders.length})
            </div>
            {spotOrders.length === 0 ? (
              <div className="text-xs text-muted-foreground">No open spot orders.</div>
            ) : (
              <table className="w-full text-[11px] font-mono">
                <tbody>
                  {spotOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border/20">
                      <td className="py-1 font-sans font-semibold">{o.symbol}</td>
                      <td className={o.side === "BUY" ? "text-buy" : "text-sell"}>{o.side}</td>
                      <td className="text-right">{o.qty}</td>
                      <td className="text-right">{o.price ? formatPrice(Number(o.price)) : "MKT"}</td>
                      <td className="text-right text-muted-foreground">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="text-[10px] text-muted-foreground uppercase mb-1.5 mt-3">
              Recent spot fills ({fills.filter((f) => f.market === "SPOT").length})
            </div>
            {fills.filter((f) => f.market === "SPOT").length === 0 ? (
              <div className="text-xs text-muted-foreground">No spot fills yet.</div>
            ) : (
              <table className="w-full text-[11px] font-mono">
                <tbody>
                  {fills.filter((f) => f.market === "SPOT").slice(0, 10).map((f) => (
                    <tr key={f.tradeId} className="border-b border-border/20">
                      <td className="py-1 font-sans font-semibold">{f.symbol}</td>
                      <td className={f.side === "BUY" ? "text-buy" : "text-sell"}>{f.side}</td>
                      <td className="text-right">{f.quantity} @ {formatPrice(parseFloat(f.price) || 0)}</td>
                      <td className="text-right text-muted-foreground">{new Date(f.executedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="futuresOrders" className="flex-1 overflow-auto m-0">
          {futuresOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">No open futures orders.</div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Symbol</th>
                  <th className="text-left">Side</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Filled</th>
                  <th className="text-right">Status</th>
                  <th className="text-right pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {futuresOrders.map(o => (
                  <tr key={o.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2 font-sans font-semibold">{o.symbol}</td>
                    <td className={o.side === "BUY" ? "text-buy" : "text-sell"}>{o.side}</td>
                    <td>
                      {o.groupRole ? (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold",
                            o.groupRole === "TP" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"
                          )}
                          title={`${o.groupRole === "TP" ? "Take-profit" : "Stop-loss"} — protects filled exposure, cancelled automatically if its sibling leg fills`}
                        >
                          {o.groupRole === "TP" ? "TP" : "SL"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-right">{o.qty}</td>
                    <td className="text-right">{o.price ? formatPrice(Number(o.price)) : "MKT"}</td>
                    <td className="text-right text-muted-foreground">{o.filled}</td>
                    <td className="text-right text-muted-foreground">{o.status}</td>
                    <td className="text-right pr-3">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-sell"
                        onClick={() => handleCancel(o.symbol, o.market, o.id)}><X className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="optionsOrders" className="flex-1 overflow-auto m-0">
          {optionsOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">No open options orders.</div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Symbol</th>
                  <th className="text-left">Side</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Filled</th>
                  <th className="text-right">Status</th>
                  <th className="text-right pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {optionsOrders.map(o => (
                  <tr key={o.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2 font-sans font-semibold">{o.symbol}</td>
                    <td className={o.side === "BUY" ? "text-buy" : "text-sell"}>{o.side}</td>
                    <td className="text-right">{o.qty}</td>
                    <td className="text-right">{o.price ? formatPrice(Number(o.price)) : "MKT"}</td>
                    <td className="text-right text-muted-foreground">{o.filled}</td>
                    <td className="text-right text-muted-foreground">{o.status}</td>
                    <td className="text-right pr-3">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-sell"
                        onClick={() => handleCancel(o.symbol, o.market, o.id)}><X className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="automated" className="flex-1 overflow-auto m-0">
          {!botsAuthed ? (
            <div className="flex flex-col items-center justify-center gap-1 py-10 text-center text-xs text-muted-foreground">
              <Bot className="h-5 w-5 mb-1 opacity-50" />
              Connect your wallet to see your bots.
            </div>
          ) : myBots.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-10 text-center text-xs text-muted-foreground">
              <Bot className="h-5 w-5 mb-1 opacity-50" />
              No bots running yet.
              <span>Create one from Trading Bots to see it here.</span>
            </div>
          ) : (
            <table className="w-full min-w-[880px] text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Source</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Strategy</th>
                  <th className="text-left">Symbol</th>
                  <th className="text-left">Market</th>
                  <th className="text-right">Investment</th>
                  <th className="text-right">Net PnL</th>
                  <th className="text-right pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {myBots.map(bot => {
                  const statusDisplay = botStatusDisplay(bot);
                  const netPnl = parseFloat(bot.stats?.netPnl ?? "0");
                  const isAI = bot.strategy === "market_maker";
                  return (
                    <tr key={bot.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-sans text-[10px] font-semibold",
                          isAI ? "bg-primary/10 text-primary" : "bg-secondary/15 text-secondary"
                        )}>
                          {isAI ? <Sparkles className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                          {isAI ? "AI Agent" : "Bot"}
                        </span>
                      </td>
                      <td className="font-sans font-semibold">{bot.name}</td>
                      <td className="text-muted-foreground">{humanizeStrategy(bot.strategy)}</td>
                      <td className="font-sans font-semibold">{bot.symbol}</td>
                      <td>{bot.market}</td>
                      <td className="text-right">${formatPrice(parseFloat(bot.investment))}</td>
                      <td className={cn("text-right", netPnl >= 0 ? "text-buy" : "text-sell")}>
                        {netPnl >= 0 ? "+" : ""}${formatPrice(Math.abs(netPnl))}
                      </td>
                      <td className="text-right pr-3">
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          statusDisplay.tone === "buy" && "bg-buy/10 text-buy",
                          statusDisplay.tone === "primary" && "bg-primary/10 text-primary",
                          statusDisplay.tone === "warning" && "bg-warning/10 text-warning",
                          statusDisplay.tone === "sell" && "bg-sell/10 text-sell",
                          statusDisplay.tone === "muted" && "bg-muted text-muted-foreground"
                        )}>
                          {statusDisplay.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto m-0">
          {orderHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">No order history yet.</div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Time</th>
                  <th className="text-left">Symbol</th>
                  <th className="text-left">Side</th>
                  <th className="text-right">Size</th>
                  <th className="text-right">Avg Fill</th>
                  <th className="text-right">Fee</th>
                  <th className="text-right">Status</th>
                  <th className="text-left pr-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.map((h) => (
                  <tr key={h.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2">{new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="font-sans font-semibold">{h.symbol}</td>
                    <td className={h.side === "BUY" ? "text-buy" : "text-sell"}>{h.side}</td>
                    <td className="text-right">{h.filled}/{h.quantity}</td>
                    <td className="text-right">{parseFloat(h.avgFillPrice) > 0 ? formatPrice(parseFloat(h.avgFillPrice)) : "—"}</td>
                    <td className="text-right text-muted-foreground">{parseFloat(h.feePaid) > 0 ? h.feePaid : "—"}</td>
                    <td className="text-right text-muted-foreground">{h.status}</td>
                    <td className="text-left pr-3 text-muted-foreground truncate max-w-[220px]" title={h.rejectReason}>{h.rejectReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="trades" className="flex-1 overflow-auto m-0">
          {fills.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">No trades yet. Open a position to start.</div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Time</th>
                  <th className="text-left">Symbol</th>
                  <th className="text-left">Side</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Size</th>
                  <th className="text-right pr-3">Fee</th>
                </tr>
              </thead>
              <tbody>
                {fills.map((f) => (
                  <tr key={f.tradeId} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2">{new Date(f.executedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="font-sans font-semibold">{f.symbol}</td>
                    <td className={f.side === "BUY" ? "text-buy" : "text-sell"}>{f.side}</td>
                    <td className="text-right">{formatPrice(parseFloat(f.price) || 0)}</td>
                    <td className="text-right">{f.quantity}</td>
                    <td className="text-right pr-3 text-muted-foreground">{f.feePaid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>
        <TabsContent value="funding" className="flex-1 overflow-auto m-0">
          {fundingHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">
              No funding payments yet. Funding settles every 8 hours.
            </div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Time</th>
                  <th className="text-left">Symbol</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right pr-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {fundingHistory.map((f, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-3 py-2">{f.time}</td>
                    <td className="font-sans font-semibold">{f.symbol}</td>
                    <td className={cn("text-right", parseFloat(f.rate) >= 0 ? "text-buy" : "text-sell")}>{f.rate}</td>
                    <td className={cn("text-right pr-3 font-bold", f.payment >= 0 ? "text-buy" : "text-sell")}>
                      {f.payment >= 0 ? "+" : ""}${f.payment.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="realizedPnl" className="flex-1 overflow-auto m-0">
          {realizedPnl.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">
              No realized PnL yet. Closing a position records it here.
            </div>
          ) : (
            <table className="w-full text-[11px] font-mono">
              <thead className="text-[10px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-1.5">Time</th>
                  <th className="text-left">Symbol</th>
                  <th className="text-right">Closed Qty</th>
                  <th className="text-right">Margin Returned</th>
                  <th className="text-right">PnL</th>
                  <th className="text-left pr-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {realizedPnl.map((p, i) => {
                  const pnl = parseFloat(p.pnl);
                  return (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-2">{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="font-sans font-semibold">{p.symbol}</td>
                      <td className="text-right">{p.closedQty}</td>
                      <td className="text-right text-muted-foreground">{p.marginReturned}</td>
                      <td className={cn("text-right font-bold", pnl >= 0 ? "text-buy" : "text-sell")}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </td>
                      <td className="text-left pr-3 text-muted-foreground">{p.isLiquidation ? "Liquidation" : "Close"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
