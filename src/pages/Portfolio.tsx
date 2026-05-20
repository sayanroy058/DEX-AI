import { AppShell } from "@/components/AppShell";
import { useMarkets } from "@/lib/useMarkets";
import { formatPrice } from "@/lib/mockData";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, PieChart, ArrowDownToLine, ArrowUpFromLine, History, DollarSign, BarChart3, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TransferDialog } from "@/components/wallet/TransferDialog";

const HOLDINGS = [
  { symbol: "BTC-PERP", side: "long", size: 0.142, entry: 66120, leverage: 10 },
  { symbol: "ETH-PERP", side: "short", size: 2.4, entry: 3580, leverage: 5 },
  { symbol: "SOL-PERP", side: "long", size: 18.5, entry: 162.4, leverage: 20 },
  { symbol: "HYPE-PERP", side: "long", size: 200, entry: 27.5, leverage: 8 },
];

const ASSET_BREAKDOWN = [
  { asset: "DEXUSD", value: 12006, pct: 42, color: "hsl(145 65% 52%)" },
  { asset: "BTC", value: 9524, pct: 38, color: "hsl(38 90% 55%)" },
  { asset: "ETH", value: 6318, pct: 25, color: "hsl(225 70% 65%)" },
  { asset: "SOL", value: 3762, pct: 15, color: "hsl(280 80% 65%)" },
  { asset: "USDT", value: 2006, pct: 7, color: "hsl(178 70% 50%)" },
  { asset: "Others", value: 988, pct: 3, color: "hsl(220 20% 45%)" },
];

const FROZEN_AMOUNT = [
  { bucket: "Spot", value: 8240 },
  { bucket: "Future", value: 5932 },
  { bucket: "Option", value: 2480 },
  { bucket: "P2P", value: 3615 },
  { bucket: "Copy Trading", value: 4180 },
  { bucket: "Funding A/C", value: 3025 },
];

const TRANSACTIONS = [
  { id: "T001", type: "Deposit", asset: "USDT", amount: "+5,000", date: "2026-05-10", status: "completed", network: "TRC-20" },
  { id: "T002", type: "Withdraw", asset: "USDT", amount: "-2,000", date: "2026-05-08", status: "completed", network: "ERC-20" },
  { id: "T003", type: "Deposit", asset: "BTC", amount: "+0.05", date: "2026-05-06", status: "completed", network: "BTC" },
  { id: "T004", type: "Withdraw", asset: "ETH", amount: "-0.8", date: "2026-05-04", status: "pending", network: "ERC-20" },
  { id: "T005", type: "Deposit", asset: "SOL", amount: "+12", date: "2026-05-02", status: "completed", network: "SOL" },
  { id: "T006", type: "Withdraw", asset: "USDT", amount: "-500", date: "2026-04-29", status: "failed", network: "TRC-20" },
];

const Portfolio = () => {
  const markets = useMarkets();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<"deposit" | "withdraw">("deposit");

  const openTransfer = (m: "deposit" | "withdraw") => { setTransferMode(m); setTransferOpen(true); };

  const positions = useMemo(() => HOLDINGS.map(h => {
    const m = markets.find(mk => mk.symbol === h.symbol);
    const mark = m?.price ?? h.entry;
    const dir = h.side === "long" ? 1 : -1;
    const pnl = (mark - h.entry) * h.size * dir;
    const pnlPct = ((mark - h.entry) / h.entry) * 100 * dir * h.leverage;
    const value = mark * h.size;
    return { ...h, mark, pnl, pnlPct, value };
  }), [markets]);

  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const balance = 25000;
  const equity = balance + totalPnl;
  const totalFunds = equity + totalValue;
  const totalFrozen = FROZEN_AMOUNT.reduce((sum, item) => sum + item.value, 0);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground text-sm mt-1">Account overview, performance, and analytics</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openTransfer("deposit")} className="flex-1 sm:flex-none bg-buy/15 text-buy hover:bg-buy/25 border border-buy/30 h-9" variant="outline">
              <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Deposit
            </Button>
            <Button onClick={() => openTransfer("withdraw")} variant="outline" className="flex-1 sm:flex-none glass h-9">
              <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" /> Withdraw
            </Button>
          </div>
        </div>

        {/* Key stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Funds" value={`$${totalFunds.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub="Equity + Position Value" icon={DollarSign} highlight />
          <StatCard label="Available Balance" value={`$${balance.toLocaleString()}`} sub="Ready to trade" icon={Wallet} />
          <StatCard label="Unrealized PnL" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`} sub={`${totalPnl >= 0 ? "+" : ""}${((totalPnl / balance) * 100).toFixed(2)}% return`} icon={totalPnl >= 0 ? ArrowUpRight : ArrowDownRight} tone={totalPnl >= 0 ? "buy" : "sell"} />
          <StatCard label="Position Value" value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${positions.length} open positions`} icon={BarChart3} />
        </div>

        {/* Frozen amount allocation */}
        <div className="glass rounded-xl p-4 border border-primary/25">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Frozen Amount</h3>
            <span className="text-xs text-muted-foreground">Total frozen: <span className="font-mono text-foreground">${totalFrozen.toLocaleString()}</span></span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {FROZEN_AMOUNT.map((item) => (
              <div key={item.bucket} className="glass rounded-lg p-2.5">
                <div className="text-[10px] text-muted-foreground">{item.bucket}</div>
                <div className="font-mono font-bold text-sm mt-0.5">${item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EquityChart pnl={totalPnl} />
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Asset Breakdown</h3>
            <div className="space-y-2.5">
              {ASSET_BREAKDOWN.map(a => (
                <div key={a.asset}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{a.asset}</span>
                    <span className="text-muted-foreground">${a.value.toLocaleString()} · {a.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${a.pct}%`, background: a.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-3 text-xs">
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-muted-foreground mb-1">24h Change</div>
                <div className="font-bold text-buy">+$342.18</div>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-muted-foreground mb-1">7d Change</div>
                <div className="font-bold text-buy">+$1,240.50</div>
              </div>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Open Positions</h3>
            <span className="text-xs text-muted-foreground">{positions.length} active</span>
          </div>
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-left">Side</th>
                  <th className="text-right">Size</th>
                  <th className="text-right">Entry</th>
                  <th className="text-right">Mark</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Margin</th>
                  <th className="text-right pr-4">PnL</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <tr key={p.symbol} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold">{p.symbol} <span className="text-[10px] text-muted-foreground">{p.leverage}x</span></td>
                    <td className={cn("font-semibold text-xs", p.side === "long" ? "text-buy" : "text-sell")}>{p.side.toUpperCase()}</td>
                    <td className="text-right font-mono">{p.size}</td>
                    <td className="text-right font-mono">{formatPrice(p.entry)}</td>
                    <td className="text-right font-mono">{formatPrice(p.mark)}</td>
                    <td className="text-right font-mono">${p.value.toFixed(2)}</td>
                    <td className="text-right font-mono text-muted-foreground">${(p.value / p.leverage).toFixed(2)}</td>
                    <td className={cn("text-right pr-4 font-mono font-bold", p.pnl >= 0 ? "text-buy" : "text-sell")}>
                      {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                      <div className="text-[10px] opacity-70">{p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Transaction History</h3>
            <div className="flex gap-1">
              {["All", "Deposit", "Withdraw"].map((f, i) => (
                <button key={f} className={cn("px-2 py-1 text-[10px] rounded", i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40")}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left">Asset</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Network</th>
                  <th className="text-right">Date</th>
                  <th className="text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map(t => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1.5 font-medium text-xs", t.type === "Deposit" ? "text-buy" : "text-sell")}>
                        {t.type === "Deposit" ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="font-mono font-semibold">{t.asset}</td>
                    <td className={cn("text-right font-mono font-bold", t.type === "Deposit" ? "text-buy" : "text-sell")}>{t.amount}</td>
                    <td className="text-right text-xs text-muted-foreground">{t.network}</td>
                    <td className="text-right text-xs text-muted-foreground">{t.date}</td>
                    <td className="text-right pr-4">
                      {t.status === "completed" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-buy bg-buy/10 border border-buy/20 rounded px-2 py-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> Completed</span>}
                      {t.status === "pending" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 rounded px-2 py-0.5"><Clock className="h-2.5 w-2.5" /> Pending</span>}
                      {t.status === "failed" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sell bg-sell/10 border border-sell/20 rounded px-2 py-0.5"><XCircle className="h-2.5 w-2.5" /> Failed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} defaultMode={transferMode} />
    </AppShell>
  );
};

function StatCard({ label, value, sub, icon: Icon, tone, highlight }: { label: string; value: string; sub?: string; icon: any; tone?: "buy" | "sell"; highlight?: boolean }) {
  return (
    <div className={cn("glass rounded-xl p-4 relative overflow-hidden", highlight && "border border-primary/30")}>
      {highlight && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
      <div className="relative flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", highlight ? "bg-primary/20" : "bg-muted/30")}>
          <Icon className={cn("h-3.5 w-3.5", tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-primary")} />
        </div>
      </div>
      <div className={cn("relative text-xl font-bold font-mono", tone === "buy" && "text-buy", tone === "sell" && "text-sell", highlight && "gradient-text")}>{value}</div>
      {sub && <div className="relative text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function EquityChart({ pnl }: { pnl: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data] = useState(() => {
    const arr: number[] = [];
    let v = 22000;
    for (let i = 0; i < 60; i++) { v += (Math.random() - 0.45) * 400; arr.push(v); }
    return arr;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const fullData = [...data, 25000 + pnl];
    const min = Math.min(...fullData), max = Math.max(...fullData);
    const range = (max - min) || 1;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "hsl(186 100% 55% / 0.4)"); grad.addColorStop(1, "hsl(186 100% 55% / 0)");
    ctx.beginPath();
    fullData.forEach((v, i) => { const x = (i / (fullData.length - 1)) * W; const y = H - ((v - min) / range) * H * 0.85 - 10; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    fullData.forEach((v, i) => { const x = (i / (fullData.length - 1)) * W; const y = H - ((v - min) / range) * H * 0.85 - 10; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.strokeStyle = "hsl(186 100% 55%)"; ctx.lineWidth = 2; ctx.shadowColor = "hsl(186 100% 55% / 0.6)"; ctx.shadowBlur = 10; ctx.stroke();
  }, [data, pnl]);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Equity Curve</h3>
        <div className="flex gap-1">
          {["1D", "7D", "30D", "All"].map((p, i) => (
            <button key={p} className={cn("px-2 py-1 text-[10px] rounded", i === 1 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40")}>{p}</button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-48 relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="glass rounded-lg p-2 text-center"><div className="text-muted-foreground text-[10px]">All-time PnL</div><div className="font-bold text-buy mt-0.5">+$12,840</div></div>
        <div className="glass rounded-lg p-2 text-center"><div className="text-muted-foreground text-[10px]">Win Rate</div><div className="font-bold mt-0.5">62%</div></div>
        <div className="glass rounded-lg p-2 text-center"><div className="text-muted-foreground text-[10px]">Avg. Trade</div><div className="font-bold text-buy mt-0.5">+$214</div></div>
      </div>
    </div>
  );
}

export default Portfolio;
