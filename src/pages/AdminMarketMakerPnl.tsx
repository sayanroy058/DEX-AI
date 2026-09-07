import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, ArrowUpDown, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { listMarketMakers, type MarketMaker } from "@/lib/marketMakerApi";

function fmt(v: string | undefined, dp = 2): string {
  const n = Number(v ?? "0");
  if (!Number.isFinite(n)) return v ?? "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

type SortKey = "netPnl" | "realizedPnl" | "unrealizedPnl" | "roi" | "symbol";

export default function AdminMarketMakerPnl() {
  const [desks, setDesks] = useState<MarketMaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("netPnl");
  const [sortDesc, setSortDesc] = useState(true);

  const load = () =>
    listMarketMakers()
      .then((r) => setDesks(r.marketMakers ?? []))
      .catch((e) => setError(e.message || "Could not load market makers."))
      .finally(() => setLoading(false));

  useEffect(() => {
    document.title = "Market Maker P/L | BitDx";
    load();
    // Live refresh: P/L moves with every fill and every index tick.
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const summary = useMemo(() => {
    const totalNet = desks.reduce((sum, d) => sum + Number(d.stats?.netPnl ?? "0"), 0);
    const totalRealized = desks.reduce((sum, d) => sum + Number(d.stats?.realizedPnl ?? "0"), 0);
    const totalUnrealized = desks.reduce((sum, d) => sum + Number(d.stats?.unrealizedPnl ?? "0"), 0);
    const profitable = desks.filter((d) => Number(d.stats?.netPnl ?? "0") > 0).length;
    const losing = desks.filter((d) => Number(d.stats?.netPnl ?? "0") < 0).length;
    const running = desks.filter((d) => d.isRunning).length;
    return { totalNet, totalRealized, totalUnrealized, profitable, losing, running };
  }, [desks]);

  const sorted = useMemo(() => {
    const copy = [...desks];
    copy.sort((a, b) => {
      if (sortKey === "symbol") {
        return sortDesc ? b.symbol.localeCompare(a.symbol) : a.symbol.localeCompare(b.symbol);
      }
      const av = Number(a.stats?.[sortKey] ?? "0");
      const bv = Number(b.stats?.[sortKey] ?? "0");
      return sortDesc ? bv - av : av - bv;
    });
    return copy;
  }, [desks, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {summary.totalNet >= 0 ? <TrendingUp className="h-7 w-7 text-buy" /> : <TrendingDown className="h-7 w-7 text-sell" />}
              Market Maker P/L
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Profit and loss across every market-maker desk, at a glance
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading desks…
          </div>
        ) : desks.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">
            No market-maker desks yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SummaryTile
                label="Total Net P/L"
                value={`${summary.totalNet >= 0 ? "+" : ""}$${fmt(String(summary.totalNet))}`}
                valueClass={summary.totalNet >= 0 ? "text-buy" : "text-sell"}
              />
              <SummaryTile
                label="Realized"
                value={`${summary.totalRealized >= 0 ? "+" : ""}$${fmt(String(summary.totalRealized))}`}
                valueClass={summary.totalRealized >= 0 ? "text-buy" : "text-sell"}
              />
              <SummaryTile
                label="Unrealized"
                value={`${summary.totalUnrealized >= 0 ? "+" : ""}$${fmt(String(summary.totalUnrealized))}`}
                valueClass={summary.totalUnrealized >= 0 ? "text-buy" : "text-sell"}
              />
              <SummaryTile label="Profitable / Losing" value={`${summary.profitable} / ${summary.losing}`} />
              <SummaryTile label="Running" value={`${summary.running} / ${desks.length}`} />
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                      <Th label="Desk" onClick={() => toggleSort("symbol")} active={sortKey === "symbol"} desc={sortDesc} />
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-right px-3 py-2 font-medium">Funded (base / quote)</th>
                      <Th label="Realized" onClick={() => toggleSort("realizedPnl")} active={sortKey === "realizedPnl"} desc={sortDesc} align="right" />
                      <Th label="Unrealized" onClick={() => toggleSort("unrealizedPnl")} active={sortKey === "unrealizedPnl"} desc={sortDesc} align="right" />
                      <Th label="Net P/L" onClick={() => toggleSort("netPnl")} active={sortKey === "netPnl"} desc={sortDesc} align="right" />
                      <Th label="ROI" onClick={() => toggleSort("roi")} active={sortKey === "roi"} desc={sortDesc} align="right" />
                      <th className="text-right px-3 py-2 font-medium">Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d) => {
                      const net = Number(d.stats?.netPnl ?? "0");
                      const realized = Number(d.stats?.realizedPnl ?? "0");
                      const unrealized = Number(d.stats?.unrealizedPnl ?? "0");
                      return (
                        <tr key={d.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold">{d.symbol}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{d.market}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              d.isRunning ? "bg-buy/15 text-buy" : "bg-muted text-muted-foreground"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${d.isRunning ? "bg-buy" : "bg-muted-foreground"}`} />
                              {d.isRunning ? "Running" : "Stopped"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                            {fmt(d.baseAmount, 4)} {d.base} / {fmt(d.quoteAmount)} {d.quoteAsset ?? "BIUSD"}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono ${realized >= 0 ? "text-buy" : "text-sell"}`}>
                            {realized >= 0 ? "+" : ""}{fmt(String(realized))}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono ${unrealized >= 0 ? "text-buy" : "text-sell"}`}>
                            {unrealized >= 0 ? "+" : ""}{fmt(String(unrealized))}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${net >= 0 ? "text-buy" : "text-sell"}`}>
                            <span className="inline-flex items-center gap-1">
                              {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {net >= 0 ? "+" : ""}{fmt(String(net))}
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono ${Number(d.stats?.roi ?? "0") >= 0 ? "text-buy" : "text-sell"}`}>
                            {Number(d.stats?.roi ?? "0") >= 0 ? "+" : ""}{fmt(d.stats?.roi)}%
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{d.stats?.matchedTrades ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryTile({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${valueClass ?? ""}`}>{value}</div>
    </div>
  );
}

function Th({
  label, onClick, active, desc, align = "left",
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  desc: boolean;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={onClick}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-primary" : "opacity-40"} ${active && !desc ? "rotate-180" : ""}`} />
      </span>
    </th>
  );
}
