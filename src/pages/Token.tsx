import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, TrendingUp, Users, ExternalLink, Copy, FileText,
  ShieldCheck, Flame, BarChart3, Clock, Activity,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Mock data ────────────────────────────────────────────────────────────────

const SUPPLY_ALLOC = [
  { name: "Community + Ecosystem", value: 15, color: "#00e5ff" },
  { name: "Staking/Emission (100 years)", value: 20, color: "#a855f7" },
  { name: "Liquidity", value: 10, color: "#10b981" },
  { name: "Team", value: 5, color: "#6366f1" },
  { name: "Treasury", value: 8, color: "#ef4444" },
  { name: "Strategic Reserve", value: 35, color: "#22d3ee" },
  { name: "Marketing", value: 5, color: "#f59e0b" },
  { name: "Initial Burn", value: 2, color: "#fb7185" },
];

const EMISSION_YEARS = [2022,2023,2024,2025,2026,2027,2028,2029,2030];
const EMISSION_DATA = EMISSION_YEARS.map((y, i) => ({
  year: String(y),
  Circulating: Math.round(100 + i * 35),
  "Locked / Vested": Math.round(600 - i * 60),
  Burned: Math.round(5 + i * 5.5),
}));

function buildPriceHistory() {
  let p = 2.8;
  return Array.from({ length: 30 }, (_, i) => {
    p = p * (1 + (Math.random() - 0.48) * 0.04);
    return { d: `d${i + 1}`, price: parseFloat(p.toFixed(4)) };
  });
}

function buildStabilityHistory() {
  return Array.from({ length: 30 }, (_, i) => ({
    d: `d${i + 1}`,
    price: parseFloat((1 + (Math.random() - 0.5) * 0.004).toFixed(4)),
  }));
}

const PRICE_HIST = buildPriceHistory();
const STABLE_HIST = buildStabilityHistory();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={cn("font-bold text-lg font-mono", accent ? "text-primary" : "text-foreground")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono font-semibold">{v}</span>
    </div>
  );
}

function CopyAddress({ addr }: { addr: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const short = addr.slice(0, 6) + "…" + addr.slice(-4);
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 glass rounded-lg px-2.5 py-1 text-[11px] font-mono hover:border-primary/40 transition-all">
      {short}
      <Copy className={cn("h-3 w-3", copied ? "text-buy" : "text-muted-foreground")} />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Token() {
  const [dexPrice, setDexPrice] = useState(3.42);

  useEffect(() => {
    const id = setInterval(() => {
      setDexPrice(p => parseFloat((p * (1 + (Math.random() - 0.49) * 0.003)).toFixed(4)));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const change24h = 5.6;
  const marketCap  = (dexPrice * 412_500_000);
  const fdv        = (dexPrice * 1_000_000_000);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-2xl font-bold">Tokenomics</h1>
          <p className="text-sm text-muted-foreground mt-1">The native DEX token and the DEXUSD stablecoin powering the ecosystem.</p>
        </div>

        {/* ══════════════════════════════════════════════
            DEX TOKEN SECTION
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold">DEX Token</h2>
          </div>

          {/* Top row: price card + supply allocation */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">

            {/* Price card */}
            <div className="glass rounded-2xl p-5 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                  <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none">DEX Token</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">DEX</span>
                    <span className="text-xs text-buy font-mono">→ +{change24h}%</span>
                  </div>
                </div>
              </div>

              <div className="text-2xl sm:text-4xl font-bold gradient-text font-mono mb-0.5">
                ${dexPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mb-4">Real-time price · USD</div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Market Cap</div>
                  <div className="font-mono font-bold text-sm">${(marketCap / 1e9).toFixed(2)}B</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">FDV</div>
                  <div className="font-mono font-bold text-sm">${(fdv / 1e9).toFixed(2)}B</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Circulating</div>
                  <div className="font-mono font-bold text-sm">412.5M</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">41.25% of Total</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Total Supply</div>
                  <div className="font-mono font-bold text-sm">1.0B</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Burned</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">52.4M DEX</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">5.24% Total Supply</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Holders</div>
                  <div className="font-mono font-bold text-sm">248,302</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">+1,204 last 24h</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <CopyAddress addr="0x9f3s...A219" />
                <button className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                  Etherscan <ExternalLink className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            {/* Supply allocation donut */}
            <div className="glass rounded-2xl p-5 border border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Supply Allocation</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <button className="rounded-md bg-primary/20 px-2.5 py-1 text-primary">Allocation</button>
                  <button className="rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
                    Initial Distribution
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={SUPPLY_ALLOC} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                      dataKey="value" stroke="none">
                      {SUPPLY_ALLOC.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(230 25% 9%)", border: "1px solid hsl(230 25% 18%)", borderRadius: 8, fontSize: 11 }}
                      itemStyle={{ color: "hsl(0 0% 98%)" }}
                      labelStyle={{ color: "hsl(220 15% 70%)" }}
                      formatter={(v: number | string) => [`${v}%`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold font-mono">1.0B</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
                {SUPPLY_ALLOC.map(s => (
                  <div key={s.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px]">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="truncate text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-mono font-semibold">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supply over time line chart */}
          <div className="glass rounded-2xl p-5 border border-border/50 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Supply Over Time</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Projected emission schedule 2022 — 2030</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {["Circulating","Burned","Total Supply"].map(t => (
                  <button key={t} className="text-[10px] px-2 py-0.5 rounded glass hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors">{t}</button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={EMISSION_DATA} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18% / 0.5)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 15% 55%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(230 25% 9%)", border: "1px solid hsl(230 25% 18%)", borderRadius: 8, fontSize: 11 }}
                  cursor={{ fill: "hsl(230 25% 18% / 0.4)" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Line type="monotone" dataKey="Circulating" stroke="#00e5ff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Locked / Vested" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Burned" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </section>

        {/* ══════════════════════════════════════════════
            DEXUSD STABLECOIN SECTION
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-lg font-bold">DEXUSD Stablecoin</h2>
          </div>

          {/* Three-col row */}
          <div className="grid lg:grid-cols-3 gap-4 mb-4">

            {/* DEXUSD card */}
            <div className="glass rounded-2xl p-5 border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">$</div>
                <div>
                  <div className="font-bold text-lg leading-none">DEXUSD</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">DEXUSD</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-buy border-buy/40">Pegged</Badge>
                  </div>
                </div>
              </div>

              <div className="text-3xl font-bold text-buy font-mono mb-0.5">$1.0001</div>
              <div className="text-[11px] text-muted-foreground mb-4 flex items-center gap-1">
                Target: $1.00 <Activity className="h-3 w-3 text-buy animate-pulse" />
              </div>

              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="text-[11px] text-muted-foreground">Contract</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <CopyAddress addr="0x402a3f89b21c77d4e10e4a52c908f8ab13c4F981" />
                  <button className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                    Etherscan <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Price stability sparkline */}
            <div className="glass rounded-2xl p-5 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Price Stability</span>
                </div>
                <span className="text-[10px] text-muted-foreground glass px-2 py-0.5 rounded">30D History</span>
              </div>

              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-3">
                <span>$1.010 high</span>
                <span>$1.00 peg</span>
                <span>$0.980 low</span>
              </div>

              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={STABLE_HIST} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                  <defs>
                    <linearGradient id="gStable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(145 85% 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(145 85% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18% / 0.5)" />
                  <XAxis dataKey="d" hide />
                  <YAxis domain={[0.98, 1.01]} tick={{ fill: "hsl(220 15% 55%)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(3)}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(230 25% 9%)", border: "1px solid hsl(230 25% 18%)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [`$${v}`, "Price"]}
                  />
                  <Area type="monotone" dataKey="price" stroke="hsl(145 85% 50%)" strokeWidth={1.5} fill="url(#gStable)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                <span>-30 days</span>
                <span>Now</span>
              </div>
            </div>

            {/* Reserve composition */}
            <div className="glass rounded-2xl p-5 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Reserve Composition</span>
              </div>

              {/* Stacked bar */}
              <div className="h-3 rounded-full overflow-hidden flex mb-4">
                <div className="bg-cyan-400" style={{ width: "60%" }} />
                <div className="bg-indigo-500" style={{ width: "30%" }} />
                <div className="bg-emerald-500" style={{ width: "10%" }} />
              </div>

              <div className="space-y-3">
                {[
                  { label: "BTC", pct: 60, val: "$487.4M", color: "bg-cyan-400" },
                  { label: "ETH", pct: 30, val: "$243.7M", color: "bg-indigo-500" },
                  { label: "DEXUSD", pct: 10, val: "$81.2M", color: "bg-emerald-500" },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-2 text-[11px]">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${r.color}`} />
                    <span className="text-muted-foreground flex-1">{r.label} <span className="text-foreground">{r.pct}%</span></span>
                    <span className="font-mono font-semibold">{r.val}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="w-full mt-4 glass border-primary/40 text-primary hover:bg-primary/10 text-xs h-8">
                View Reserve transparency <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard label="Total Issued" value="$812.4M" sub="Market Capitalization" />
            <StatCard label="Daily Volume" value="$1.2B" sub="Deep liquidity pools" />
          </div>
        </section>

        {/* ── Whitepaper CTA ── */}
        <div className="glass rounded-2xl p-6 border border-primary/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Deep dive into the architecture</div>
              <div className="text-sm text-muted-foreground">Learn about the governance, emissions, and stability mechanisms.</div>
            </div>
          </div>
          <Button className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full sm:w-auto shrink-0">
            Read Whitepaper <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>

        {/* ── Footer ── */}
        <footer className="pt-8 border-t border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                  <Zap className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <span className="font-bold">DEX<span className="gradient-text">.ai</span></span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                The all-in-one decentralized exchange for crypto, commodities, forex, and stocks. Built for the next billion traders.
              </p>
              <div className="flex gap-3 mt-4">
                {["𝕏","💬","○","✈"].map((i,idx) => (
                  <button key={idx} className="h-7 w-7 glass rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors">{i}</button>
                ))}
              </div>
            </div>

            {[
              { title: "Product", links: ["Spot","Futures","Options","Copy Trading","Prediction"] },
              { title: "Company",  links: ["About","Careers","Blog","Press","Contact"] },
              { title: "Legal",    links: ["Terms","Privacy","Cookies","Disclosures","Risk"] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-4 border-t border-border/50">
            <span>© 2026 DEX.ai · All rights reserved · v3.2.1</span>
            <span className="flex items-center gap-1.5">
              Contract: <span className="font-mono">0x5f…4218</span>
            </span>
          </div>
        </footer>

      </div>
    </AppShell>
  );
}
