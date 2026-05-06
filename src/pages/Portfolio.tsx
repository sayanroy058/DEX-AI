import { AppShell } from "@/components/AppShell";
import { useMarkets } from "@/lib/useMarkets";
import { formatPrice } from "@/lib/mockData";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useRef, useState } from "react";

const HOLDINGS = [
  { symbol: "BTC-PERP", side: "long", size: 0.142, entry: 66120, leverage: 10 },
  { symbol: "ETH-PERP", side: "short", size: 2.4, entry: 3580, leverage: 5 },
  { symbol: "SOL-PERP", side: "long", size: 18.5, entry: 162.4, leverage: 20 },
  { symbol: "HYPE-PERP", side: "long", size: 200, entry: 27.5, leverage: 8 },
];

const Portfolio = () => {
  const markets = useMarkets();

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

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground text-sm mt-1">Account overview, performance, and analytics</p>
        </div>

        {/* Stat cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard label="Total Equity" value={`$${equity.toLocaleString(undefined, {maximumFractionDigits: 2})}`} icon={Wallet} highlight />
          <StatCard label="Available Balance" value={`$${balance.toLocaleString()}`} icon={PieChart} />
          <StatCard label="Unrealized PnL" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`} icon={totalPnl >= 0 ? ArrowUpRight : ArrowDownRight} tone={totalPnl >= 0 ? "buy" : "sell"} />
          <StatCard label="Position Value" value={`$${totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={TrendingUp} />
        </div>

        {/* Equity chart */}
        <EquityChart pnl={totalPnl} />

        {/* Positions */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="font-semibold">Open Positions</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-2">Symbol</th>
                <th className="text-left">Side</th>
                <th className="text-right">Size</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Mark</th>
                <th className="text-right">Value</th>
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
    </AppShell>
  );
};

function StatCard({ label, value, icon: Icon, tone, highlight }: { label: string; value: string; icon: any; tone?: "buy" | "sell"; highlight?: boolean }) {
  return (
    <div className={cn("glass rounded-xl p-4", highlight && "neon-border")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className={cn("h-4 w-4", tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-primary")} />
      </div>
      <div className={cn("text-xl font-bold font-mono", tone === "buy" && "text-buy", tone === "sell" && "text-sell", highlight && "gradient-text")}>{value}</div>
    </div>
  );
}

function EquityChart({ pnl }: { pnl: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data] = useState(() => {
    const arr = [];
    let v = 22000;
    for (let i = 0; i < 60; i++) {
      v += (Math.random() - 0.45) * 400;
      arr.push(v);
    }
    return arr;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const fullData = [...data, 25000 + pnl];
    const min = Math.min(...fullData), max = Math.max(...fullData);
    const range = (max - min) || 1;

    // gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "hsl(186 100% 55% / 0.4)");
    grad.addColorStop(1, "hsl(186 100% 55% / 0)");

    ctx.beginPath();
    fullData.forEach((v, i) => {
      const x = (i / (fullData.length - 1)) * W;
      const y = H - ((v - min) / range) * H * 0.85 - 10;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    fullData.forEach((v, i) => {
      const x = (i / (fullData.length - 1)) * W;
      const y = H - ((v - min) / range) * H * 0.85 - 10;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "hsl(186 100% 55%)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "hsl(186 100% 55% / 0.6)";
    ctx.shadowBlur = 10;
    ctx.stroke();
  }, [data, pnl]);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Equity Curve</h3>
        <div className="flex gap-1">
          {["1D", "7D", "30D", "All"].map((p, i) => (
            <button key={p} className={cn("px-2 py-1 text-[10px] rounded", i === 1 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40")}>{p}</button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-48 relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}

export default Portfolio;
