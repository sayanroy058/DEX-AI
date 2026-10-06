import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useMarkets } from "@/lib/useMarkets";
import { useAccount } from "@/lib/account";
import { useFuturesTickers } from "@/lib/useFuturesTickers";
import { frontendSymbolFor } from "@/lib/backendMarkets";
import { getPositions, getPnlHistory, FuturesPositionDTO, RealizedPnlDTO } from "@/lib/apiClient";
import { resolveMarkPrice } from "@/components/trade/PositionsPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Target, Trophy } from "lucide-react";

const PAGE_SIZE = 50;

const fmt = (n: number) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (n: number) => (n >= 0 ? "text-buy" : "text-sell");

const PnL = () => {
  const markets = useMarkets();
  const account = useAccount();
  const tickers = useFuturesTickers();
  const [futures, setFutures] = useState<FuturesPositionDTO[]>([]);
  const [realized, setRealized] = useState<RealizedPnlDTO[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    setLoading(true);
    const load = () => {
      getPositions(account)
        .then(r => { if (!cancelled) setFutures(r.futures ?? []); })
        .catch(() => { if (!cancelled) setFutures([]); });
    };
    load();
    const interval = setInterval(load, 5000);
    getPnlHistory({ limit: PAGE_SIZE })
      .then(r => { if (!cancelled) { setRealized(r.entries ?? []); setCursor(r.nextCursor); } })
      .catch(() => { if (!cancelled) setRealized([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearInterval(interval); };
  }, [account]);

  const loadMore = () => {
    if (!cursor) return;
    setLoadingMore(true);
    getPnlHistory({ limit: PAGE_SIZE, before: cursor })
      .then(r => { setRealized(prev => [...prev, ...(r.entries ?? [])]); setCursor(r.nextCursor); })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const open = useMemo(() => futures.map(p => {
    const size = parseFloat(p.size);
    const entry = parseFloat(p.entryPrice);
    const margin = parseFloat(p.margin);
    const display = frontendSymbolFor(p.symbol, "FUTURES");
    const mark = resolveMarkPrice(tickers[p.symbol]?.markPrice, p.markPrice, markets.find(m => m.symbol === display)?.price);
    const dir = p.side === "BUY" ? 1 : -1;
    const pnl = (mark - entry) * size * dir;
    return { symbol: p.symbol, long: dir === 1, size, entry, mark, pnl, pct: margin ? (pnl / margin) * 100 : 0 };
  }), [futures, tickers, markets]);

  const unrealized = open.reduce((s, p) => s + p.pnl, 0);
  const realizedTotal = realized.reduce((s, p) => s + parseFloat(p.pnl), 0);
  const total = unrealized + realizedTotal;
  const pnls = realized.map(p => parseFloat(p.pnl));
  const wins = pnls.filter(n => n > 0).length;
  const losses = pnls.filter(n => n < 0).length;
  const winRate = wins + losses ? (wins / (wins + losses)) * 100 : 0;
  const best = pnls.length ? Math.max(...pnls) : 0;
  const worst = pnls.length ? Math.min(...pnls) : 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profit / Loss</h1>
            <p className="text-muted-foreground text-sm mt-1">Realized and unrealized PnL across your futures trades</p>
          </div>
          <Button asChild variant="outline" className="glass h-9">
            <Link to="/trade"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Trade</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat label="Total PnL" value={fmt(total)} valueClass={tone(total)} icon={total >= 0 ? TrendingUp : TrendingDown} highlight />
          <Stat label="Realized PnL" value={fmt(realizedTotal)} valueClass={tone(realizedTotal)} sub={`${realized.length} closed${cursor ? "+" : ""}`} icon={Target} />
          <Stat label="Unrealized PnL" value={fmt(unrealized)} valueClass={tone(unrealized)} sub={`${open.length} open position${open.length === 1 ? "" : "s"}`} icon={TrendingUp} />
          <Stat label="Win Rate" value={`${winRate.toFixed(1)}%`} sub={`${wins}W / ${losses}L · Best ${fmt(best)} · Worst ${fmt(worst)}`} icon={Trophy} />
        </div>

        <section className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3">Open Positions (Unrealized)</h3>
          {open.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No open positions.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead className="text-[10px] text-muted-foreground uppercase">
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1.5">Symbol</th><th className="text-left">Side</th>
                    <th className="text-right">Size</th><th className="text-right">Entry</th>
                    <th className="text-right">Mark</th><th className="text-right">PnL</th><th className="text-right">ROE</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((p, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 font-sans font-semibold">{p.symbol}</td>
                      <td className={p.long ? "text-buy" : "text-sell"}>{p.long ? "Long" : "Short"}</td>
                      <td className="text-right">{p.size}</td>
                      <td className="text-right">{p.entry.toFixed(2)}</td>
                      <td className="text-right">{p.mark.toFixed(2)}</td>
                      <td className={cn("text-right font-bold", tone(p.pnl))}>{fmt(p.pnl)}</td>
                      <td className={cn("text-right", tone(p.pct))}>{p.pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3">Realized PnL History</h3>
          {loading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>
          ) : realized.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No realized PnL yet. Closing a position records it here.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead className="text-[10px] text-muted-foreground uppercase">
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1.5">Time</th><th className="text-left">Symbol</th>
                    <th className="text-right">Closed Qty</th><th className="text-right">Margin Returned</th>
                    <th className="text-right">PnL</th><th className="text-left pl-4">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {realized.map((p, i) => {
                    const n = parseFloat(p.pnl);
                    return (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-2">{new Date(p.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td className="font-sans font-semibold">{p.symbol}</td>
                        <td className="text-right">{p.closedQty}</td>
                        <td className="text-right text-muted-foreground">{p.marginReturned}</td>
                        <td className={cn("text-right font-bold", tone(n))}>{fmt(n)}</td>
                        <td className="text-left pl-4 text-muted-foreground">{p.isLiquidation ? "Liquidation" : "Close"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {cursor && (
            <div className="mt-3 text-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</Button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

function Stat({ label, value, sub, valueClass, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; valueClass?: string; icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={cn("glass rounded-xl p-4", highlight && "border border-primary/25")}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{label}</span><Icon className="h-4 w-4" />
      </div>
      <div className={cn("font-mono text-xl font-bold", valueClass)}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default PnL;
