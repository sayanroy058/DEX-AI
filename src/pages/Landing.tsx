import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, TrendingUp, Shield, Bot, Globe, Layers, ArrowRight, BarChart3,
  Wallet, Sparkles, Apple, Smartphone, Monitor, Download, QrCode,
  TrendingDown, Activity, DollarSign, Users, Clock, Flame, Star,
  ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react";
import { WalletDialog } from "@/components/wallet/WalletDialog";
import hero from "@/assets/hero-trading.jpg";
import { INITIAL_MARKETS, tickPrice, formatPrice, formatCompact, generateCandles } from "@/lib/mockData";
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTip } from "recharts";
import { cn } from "@/lib/utils";

// ─── Types & helpers ────────────────────────────────────────────────────────

type SparkData = { v: number }[];

function buildSpark(base: number, n = 24): SparkData {
  let p = base;
  return Array.from({ length: n }, () => {
    p = p * (1 + (Math.random() - 0.49) * 0.012);
    return { v: p };
  });
}

function MiniSpark({ data, positive }: { data: SparkData; positive: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={positive ? "gUp" : "gDn"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={positive ? "hsl(145 85% 50%)" : "hsl(350 90% 60%)"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={positive ? "hsl(145 85% 50%)" : "hsl(350 90% 60%)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={positive ? "hsl(145 85% 50%)" : "hsl(350 90% 60%)"}
          strokeWidth={1.5}
          fill={`url(#${positive ? "gUp" : "gDn"})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const features = [
  { icon: TrendingUp, title: "Pro Charting", desc: "Lightning-fast charts with 50+ indicators & drawing tools." },
  { icon: Layers, title: "Spot · Futures · Options", desc: "Trade every market type from one unified terminal." },
  { icon: Bot, title: "AI Agents & Bots", desc: "Automate strategies with AI-powered trading assistants." },
  { icon: Shield, title: "Self-Custody", desc: "Connect MetaMask, Coinbase, Trust, Binance, Bitget." },
  { icon: Globe, title: "Multi-Asset", desc: "Crypto, Forex, Commodities and Stocks in one place." },
  { icon: Sparkles, title: "Up to 100× Leverage", desc: "Deep liquidity and ultra-low fees on every fill." },
];

const ORBIT_SERVICES = [
  { icon: TrendingUp, label: "Trade", color: "hsl(186 100% 55%)" },
  { icon: Bot, label: "AI Bots", color: "hsl(270 70% 65%)" },
  { icon: Shield, label: "Self-Custody", color: "hsl(145 70% 50%)" },
  { icon: Globe, label: "Multi-Asset", color: "hsl(38 90% 55%)" },
  { icon: BarChart3, label: "Analytics", color: "hsl(186 100% 55%)" },
  { icon: Users, label: "Copy Trade", color: "hsl(320 70% 60%)" },
];

// Top 6 markets to feature
const TOP_SYMBOLS = ["BTC-PERP", "ETH-PERP", "SOL-PERP", "HYPE-PERP", "DOGE-PERP", "TIA-PERP"];

function OrbitAnimation() {
  return (
    <div className="relative w-80 h-80 flex items-center justify-center select-none">
      {/* Outer glow */}
      <div className="absolute w-64 h-64 rounded-full bg-blue-500/8 blur-3xl" />

      {/* Center DEX.ai core */}
      <div className="relative z-10 h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex flex-col items-center justify-center shadow-[0_0_40px_hsl(210_100%_60%/0.5)] animate-float">
        <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
        <span className="text-[10px] font-bold text-white/90 mt-0.5">DEX.ai</span>
      </div>

      {/* Orbit rings */}
      <div className="absolute w-72 h-72 rounded-full border border-blue-500/15 animate-spin" style={{ animationDuration: "24s" }} />
      <div className="absolute w-56 h-56 rounded-full border border-cyan-500/10 animate-spin" style={{ animationDuration: "16s", animationDirection: "reverse" }} />

      {/* Orbiting service nodes — positioned around orbit ring */}
      {ORBIT_SERVICES.map((s, i) => {
        const deg = (i / ORBIT_SERVICES.length) * 360;
        return (
          <div
            key={s.label}
            className="absolute w-full h-full"
            style={{ animation: `spin 24s linear infinite`, animationDelay: `-${(i / ORBIT_SERVICES.length) * 24}s` }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ animation: `spin 24s linear infinite reverse`, animationDelay: `-${(i / ORBIT_SERVICES.length) * 24}s` }}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center border"
                style={{ background: `${s.color}1a`, borderColor: `${s.color}50`, boxShadow: `0 0 14px ${s.color}40` }}
              >
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const [email, setEmail] = useState("");

  // Live prices
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(INITIAL_MARKETS.map(m => [m.symbol, m.price]))
  );
  const [changes, setChanges] = useState<Record<string, number>>(() =>
    Object.fromEntries(INITIAL_MARKETS.map(m => [m.symbol, m.change24h]))
  );
  const [sparks, setSparks] = useState<Record<string, SparkData>>(() =>
    Object.fromEntries(INITIAL_MARKETS.map(m => [m.symbol, buildSpark(m.price)]))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        INITIAL_MARKETS.forEach(m => { next[m.symbol] = tickPrice(prev[m.symbol]); });
        return next;
      });
      setSparks(prev => {
        const next = { ...prev };
        INITIAL_MARKETS.forEach(m => {
          const arr = [...prev[m.symbol]];
          arr.shift();
          arr.push({ v: tickPrice(arr[arr.length - 1].v) });
          next[m.symbol] = arr;
        });
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // Wallet portfolio mock
  const walletAssets = [
    { symbol: "BTC", amount: 0.2418, color: "from-orange-400 to-yellow-500" },
    { symbol: "ETH", amount: 1.842, color: "from-blue-400 to-indigo-500" },
    { symbol: "SOL", amount: 24.5, color: "from-purple-400 to-pink-500" },
    { symbol: "USDT", amount: 3420.0, color: "from-emerald-400 to-teal-500" },
  ];
  const totalUSD = walletAssets.reduce((acc, a) => {
    const p = prices[a.symbol + "-PERP"] ?? prices[a.symbol + "-USDT"] ?? (a.symbol === "USDT" ? 1 : 0);
    return acc + a.amount * p;
  }, 0);

  // Trending markets
  const trending = INITIAL_MARKETS
    .filter(m => m.trending)
    .slice(0, 5)
    .map(m => ({ ...m, currentPrice: prices[m.symbol] ?? m.price }));

  // Volume leaders
  const volumeLeaders = [...INITIAL_MARKETS]
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 6)
    .map(m => ({ ...m, currentPrice: prices[m.symbol] ?? m.price }));

  const goTrade = () => navigate("/trade");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="px-6 lg:px-10 h-16 flex items-center justify-between glass-strong border-b border-glass-border sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
            <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">DEX<span className="gradient-text">.ai</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/markets" className="hover:text-foreground transition-colors">Markets</Link>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <Link to="/prop" className="hover:text-foreground transition-colors">Get Funded</Link>
          <Link to="/prediction" className="hover:text-foreground transition-colors">Predict</Link>
          <Link to="/trade" className="hover:text-foreground transition-colors">Trade</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button onClick={() => setWalletOpen(true)} className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
            <Wallet className="h-4 w-4 mr-1.5" /> Connect Wallet
          </Button>
        </div>
      </header>

      {/* Live Ticker Bar */}
      <TickerBar prices={prices} changes={changes} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#010409]">
        {/* deep starfield / mesh */}
        <div className="absolute inset-0 -z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(210_100%_12%/0.9),transparent)]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[hsl(210_100%_8%)] blur-[120px] opacity-70" />
          {/* animated grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* floating orbs */}
          <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-blue-400 animate-ping opacity-60" style={{ animationDuration: "3s" }} />
          <div className="absolute top-40 right-20 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping opacity-40" style={{ animationDuration: "4.5s" }} />
          <div className="absolute bottom-40 left-1/4 w-1 h-1 rounded-full bg-blue-300 animate-ping opacity-50" style={{ animationDuration: "2s" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-400">
              <Sparkles className="h-3 w-3" /> Next-gen on-chain trading · AI-powered
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              <span className="text-white">The</span>{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">ALL-IN-ONE DEX</span>
              <br />
              <span className="text-white">Powered by</span>{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Artificial Intelligence</span>
            </h1>
            <p className="mt-5 text-lg text-slate-400 max-w-xl leading-relaxed">
              Spot, Futures & Options across Crypto, Forex, Commodities and Stocks —
              up to <strong className="text-blue-400">100× leverage</strong>, with AI agents, copy trading and self-custody, settled on Bitcoin L2.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={goTrade} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-[0_0_24px_hsl(210_100%_60%/0.5)] h-12 px-6 font-semibold">
                Launch Terminal <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setWalletOpen(true)} className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 h-12 px-6 bg-transparent">
                <Wallet className="h-4 w-4 mr-1.5" /> Connect Wallet
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live mainnet</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Zero gas trading</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Audited contracts</span>
            </div>
            {/* Mini stats */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { v: "$2.4B+", l: "Daily Volume" },
                { v: "340K+", l: "Traders" },
                { v: "100×", l: "Max Leverage" },
              ].map(s => (
                <div key={s.l} className="border border-blue-500/20 rounded-xl p-3 bg-blue-500/5 text-center">
                  <div className="text-xl font-bold text-blue-400">{s.v}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rotating orbit animation */}
          <div className="lg:justify-self-end w-full flex items-center justify-center py-8 lg:py-0">
            <OrbitAnimation />
          </div>
        </div>

        {/* Live Market Cards — hero bottom */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOP_SYMBOLS.map(sym => {
              const mkt = INITIAL_MARKETS.find(m => m.symbol === sym)!;
              const price = prices[sym] ?? mkt.price;
              const chg = changes[sym] ?? mkt.change24h;
              const positive = chg >= 0;
              return (
                <button key={sym} onClick={goTrade}
                  className="border border-blue-500/10 bg-blue-500/5 backdrop-blur rounded-xl p-3 hover:border-blue-500/30 transition-all text-left group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{mkt.base}</span>
                    <Badge variant="outline"
                      className={cn("text-[9px] px-1 py-0 border-0 font-mono",
                        positive ? "text-buy bg-buy/10" : "text-sell bg-sell/10")}>
                      {positive ? "+" : ""}{chg.toFixed(2)}%
                    </Badge>
                  </div>
                  <MiniSpark data={sparks[sym] ?? []} positive={positive} />
                  <div className="mt-1 font-mono text-xs font-bold text-white">{formatPrice(price)}</div>
                  <div className="text-[9px] text-slate-500">{formatCompact(mkt.volume24h)} vol</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="border-y border-border/50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "$184B+", l: "Volume traded", icon: DollarSign },
            { v: "1.2M+", l: "Active traders", icon: Users },
            { v: "350+", l: "Markets", icon: BarChart3 },
            { v: "0.02%", l: "Maker fee", icon: Zap },
          ].map(s => (
            <div key={s.l} className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-3xl font-bold gradient-text">{s.v}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Markets Section */}
      <section id="markets" className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Live Markets</h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time prices across all asset classes</p>
          </div>
          <Button variant="outline" onClick={goTrade} className="glass border-primary/40 text-primary hover:bg-primary/10">
            View All Markets <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <Tabs defaultValue="crypto">
          <TabsList className="bg-muted/30 mb-4">
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="forex">Forex</TabsTrigger>
            <TabsTrigger value="commodities">Commodities</TabsTrigger>
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
          </TabsList>
          {(["crypto", "forex", "commodities", "stocks"] as const).map(cat => {
            const assetMap: Record<string, string> = { crypto: "crypto", forex: "forex", commodities: "commodity", stocks: "stocks" };
            const catMarkets = INITIAL_MARKETS.filter(m => m.asset === assetMap[cat]).slice(0, 6);
            return (
              <TabsContent key={cat} value={cat}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catMarkets.map(m => {
                    const price = prices[m.symbol] ?? m.price;
                    const chg = changes[m.symbol] ?? m.change24h;
                    const pos = chg >= 0;
                    return (
                      <button key={m.symbol} onClick={goTrade}
                        className="glass rounded-xl p-4 hover:border-primary/40 transition-all text-left group flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm">{m.base}/{m.quote}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{m.category}</Badge>
                          </div>
                          <div className="font-mono font-bold">{formatPrice(price)}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-xs font-mono", pos ? "text-buy" : "text-sell")}>
                              {pos ? "+" : ""}{chg.toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">{formatCompact(m.volume24h)} vol</span>
                          </div>
                        </div>
                        <div className="w-24 shrink-0">
                          <MiniSpark data={sparks[m.symbol] ?? []} positive={pos} />
                        </div>
                        {pos
                          ? <ArrowUpRight className="h-4 w-4 text-buy shrink-0" />
                          : <ArrowDownRight className="h-4 w-4 text-sell shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

      {/* Trending + Volume Leaders row */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 grid lg:grid-cols-2 gap-6">
        {/* Trending */}
        <div className="glass rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-orange-400" />
            <h3 className="font-bold">Trending Now</h3>
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 animate-pulse text-buy" /> Live
            </span>
          </div>
          <div className="space-y-2">
            {trending.map((m, i) => {
              const price = prices[m.symbol] ?? m.price;
              const chg = changes[m.symbol] ?? m.change24h;
              const pos = chg >= 0;
              return (
                <button key={m.symbol} onClick={goTrade}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors">
                  <span className="text-sm font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold">{m.base}</div>
                    <div className="text-[10px] text-muted-foreground">{m.symbol}</div>
                  </div>
                  <div className="w-20">
                    <MiniSpark data={sparks[m.symbol] ?? []} positive={pos} />
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold">{formatPrice(price)}</div>
                    <div className={cn("text-[10px] font-mono", pos ? "text-buy" : "text-sell")}>
                      {pos ? "+" : ""}{chg.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume leaders */}
        <div className="glass rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-bold">Top Volume</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">24h</span>
          </div>
          <div className="space-y-2">
            {volumeLeaders.map((m, i) => {
              const price = prices[m.symbol] ?? m.price;
              const chg = changes[m.symbol] ?? m.change24h;
              const pos = chg >= 0;
              const pct = (m.volume24h / volumeLeaders[0].volume24h) * 100;
              return (
                <button key={m.symbol} onClick={goTrade}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors">
                  <span className="text-sm font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{m.base}</span>
                      <span className="font-mono text-xs">{formatCompact(m.volume24h)}</span>
                    </div>
                    <Progress value={pct} className="h-1" />
                  </div>
                  <div className="text-right min-w-[56px]">
                    <div className="font-mono text-xs font-bold">{formatPrice(price)}</div>
                    <div className={cn("text-[10px] font-mono", pos ? "text-buy" : "text-sell")}>
                      {pos ? "+" : ""}{chg.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wallet Portfolio Section */}
      <section id="wallet" className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Your Portfolio</h2>
            <p className="text-sm text-muted-foreground mt-1">Connect a wallet to see your live balances</p>
          </div>
          <Button onClick={() => setWalletOpen(true)} className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
            <Wallet className="h-4 w-4 mr-1.5" /> Connect Wallet
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Portfolio value card */}
          <div className="glass-strong rounded-2xl p-6 border border-primary/20 shadow-glow-primary lg:col-span-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Estimated Balance</div>
            <div className="text-3xl font-bold gradient-text font-mono">${totalUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-buy">
              <TrendingUp className="h-3 w-3" /> +$1,284.32 (5.2%) today
            </div>
            <div className="mt-5 space-y-3">
              {walletAssets.map(a => {
                const p = prices[a.symbol + "-PERP"] ?? prices[a.symbol + "-USDT"] ?? (a.symbol === "USDT" ? 1 : 0);
                const usd = a.amount * p;
                const pct = (usd / totalUSD) * 100;
                return (
                  <div key={a.symbol} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                      {a.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-bold">{a.symbol}</span>
                        <span className="font-mono">${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                      <div className="text-[9px] text-muted-foreground mt-0.5">{a.amount} {a.symbol} · {pct.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button onClick={() => setWalletOpen(true)} className="w-full mt-5 bg-gradient-primary text-primary-foreground" size="sm">
              View Full Portfolio
            </Button>
          </div>

          {/* Wallet quick-access */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {[
              { title: "Spot Wallet", desc: "Hold and trade spot assets", icon: Wallet, val: "$12,420", tag: "+2.1%" },
              { title: "Futures Margin", desc: "Available for perpetuals", icon: Zap, val: "$8,300", tag: "10x max" },
              { title: "Options Account", desc: "Premium balance", icon: Shield, val: "$2,150", tag: "Active" },
              { title: "P2P Balance", desc: "Peer-to-peer trading", icon: Users, val: "$1,130", tag: "Available" },
            ].map(w => (
              <button key={w.title} onClick={() => setWalletOpen(true)}
                className="glass rounded-xl p-5 hover:border-primary/40 transition-all group text-left">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:shadow-glow-primary transition-all">
                    <w.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">{w.tag}</Badge>
                </div>
                <div className="mt-3">
                  <div className="font-bold text-sm">{w.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{w.desc}</div>
                  <div className="font-mono font-bold text-lg mt-2 gradient-text">{w.val}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recent activity feed */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-bold">Recent Platform Activity</h3>
          </div>
          <ActivityFeed prices={prices} />
        </div>
        <div className="glass rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-yellow-400" />
            <h3 className="font-bold">Watchlist Preview</h3>
          </div>
          <WatchlistPreview prices={prices} sparks={sparks} />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold">Built for serious traders</h2>
          <p className="mt-3 text-muted-foreground">Every tool a professional needs, wrapped in a futuristic dark-glass interface.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="glass rounded-xl p-6 hover:border-primary/40 transition-all group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:shadow-glow-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <div className="glass-strong rounded-2xl p-8 lg:p-12 text-center border border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />
          <div className="relative">
            <BarChart3 className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold">Ready to trade the markets?</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Open the terminal and start trading in seconds. No signup required to explore.</p>
            <Button size="lg" onClick={goTrade} className="mt-6 bg-gradient-primary text-primary-foreground hover:shadow-glow-primary h-12 px-8">
              Launch Terminal <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Download App */}
      <section id="download" className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <div className="glass-strong rounded-2xl p-8 lg:p-12 border border-primary/20 grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs text-primary border border-primary/30">
              <Download className="h-3 w-3" /> Get the app
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4">Trade anywhere.<br /><span className="gradient-text">On every device.</span></h2>
            <p className="text-muted-foreground mt-3 max-w-md">Native apps for mobile and desktop with the same lightning-fast experience.</p>
            <div className="grid grid-cols-2 gap-2 mt-6 max-w-md">
              <DownloadBtn icon={Apple} label="App Store" sub="iPhone & iPad" />
              <DownloadBtn icon={Smartphone} label="Google Play" sub="Android" />
              <DownloadBtn icon={Apple} label="Mac" sub="Apple Silicon" />
              <DownloadBtn icon={Monitor} label="Windows" sub=".exe installer" />
              <DownloadBtn icon={Download} label="APK" sub="Direct download" />
              <DownloadBtn icon={Monitor} label="Linux" sub=".AppImage" />
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="h-44 w-44 rounded-2xl glass border border-primary/30 p-3 flex items-center justify-center">
              <QrPattern />
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><QrCode className="h-3 w-3 text-primary" /> Scan to install</div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-56 h-[420px] rounded-[2.5rem] glass-strong border-2 border-border/60 p-2 shadow-glow-primary">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-20 rounded-full bg-background z-10" />
              <div className="h-full w-full rounded-[2rem] overflow-hidden bg-gradient-to-br from-background via-primary/10 to-secondary/10 p-3 flex flex-col">
                <div className="text-[10px] text-muted-foreground">BTC-PERP</div>
                <div className="text-2xl font-bold gradient-text">${formatPrice(prices["BTC-PERP"] ?? 67432)}</div>
                <div className={cn("text-xs", (changes["BTC-PERP"] ?? 2.34) >= 0 ? "text-buy" : "text-sell")}>
                  {(changes["BTC-PERP"] ?? 2.34) >= 0 ? "+" : ""}{(changes["BTC-PERP"] ?? 2.34).toFixed(2)}%
                </div>
                <div className="mt-3 flex-1 rounded-lg glass relative overflow-hidden">
                  <MiniSpark data={sparks["BTC-PERP"] ?? []} positive={(changes["BTC-PERP"] ?? 2.34) >= 0} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <div className="bg-buy/20 text-buy rounded py-1 text-[10px] text-center font-bold">LONG</div>
                  <div className="bg-sell/20 text-sell rounded py-1 text-[10px] text-center font-bold">SHORT</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        © 2026 DEX.ai · A next-generation trading terminal
      </footer>

      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TickerBar({ prices, changes }: { prices: Record<string, number>; changes: Record<string, number> }) {
  const symbols = INITIAL_MARKETS.slice(0, 16);
  return (
    <div className="w-full overflow-hidden border-b border-border/50 bg-background/80 backdrop-blur py-1.5">
      <div className="flex animate-[ticker_40s_linear_infinite] gap-6 whitespace-nowrap w-max">
        {[...symbols, ...symbols].map((m, i) => {
          const p = prices[m.symbol] ?? m.price;
          const chg = changes[m.symbol] ?? m.change24h;
          const pos = chg >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2">
              <span className="font-bold text-foreground">{m.base}</span>
              <span className="font-mono">{formatPrice(p)}</span>
              <span className={pos ? "text-buy" : "text-sell"}>{pos ? "+" : ""}{chg.toFixed(2)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const ACTIVITIES = [
  { user: "0x7f...3a2b", action: "Opened Long", asset: "BTC-PERP", size: "2.4 BTC", lev: "10x", side: "buy" as const },
  { user: "0x4c...8d91", action: "Opened Short", asset: "ETH-PERP", size: "15 ETH", lev: "5x", side: "sell" as const },
  { user: "0x1a...fe02", action: "Closed Long", asset: "SOL-PERP", size: "200 SOL", lev: "20x", side: "buy" as const },
  { user: "0x9b...22cf", action: "Limit Order", asset: "HYPE-PERP", size: "500", lev: "3x", side: "buy" as const },
  { user: "0x3e...7711", action: "Liquidated", asset: "DOGE-PERP", size: "10,000", lev: "50x", side: "sell" as const },
  { user: "0x6d...b440", action: "Opened Long", asset: "AAPL", size: "50 shares", lev: "2x", side: "buy" as const },
];

function ActivityFeed({ prices }: { prices: Record<string, number> }) {
  const [items, setItems] = useState(ACTIVITIES);
  useEffect(() => {
    const id = setInterval(() => {
      setItems(prev => {
        const next = [...prev];
        const r = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        next.unshift(r);
        return next.slice(0, 6);
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-1.5">
      {items.map((a, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 text-[9px] font-mono">
            {a.user.slice(2, 4).toUpperCase()}
          </div>
          <span className="text-muted-foreground font-mono">{a.user}</span>
          <span className={cn("font-bold", a.side === "buy" ? "text-buy" : "text-sell")}>{a.action}</span>
          <span className="text-foreground font-bold ml-auto">{a.asset}</span>
          <span className="text-muted-foreground">{a.size}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0">{a.lev}</Badge>
        </div>
      ))}
    </div>
  );
}

const WATCHLIST = ["BTC-PERP", "ETH-PERP", "SOL-PERP", "TIA-PERP", "SUI-PERP"];

function WatchlistPreview({ prices, sparks }: { prices: Record<string, number>; sparks: Record<string, SparkData> }) {
  return (
    <div className="space-y-2">
      {WATCHLIST.map(sym => {
        const m = INITIAL_MARKETS.find(x => x.symbol === sym)!;
        const price = prices[sym] ?? m.price;
        const chg = m.change24h;
        const pos = chg >= 0;
        return (
          <div key={sym} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">{m.base}</div>
              <div className="text-[10px] text-muted-foreground">{sym}</div>
            </div>
            <div className="w-20 shrink-0">
              <MiniSpark data={sparks[sym] ?? []} positive={pos} />
            </div>
            <div className="text-right min-w-[70px]">
              <div className="font-mono text-xs font-bold">{formatPrice(price)}</div>
              <div className={cn("text-[10px] font-mono", pos ? "text-buy" : "text-sell")}>
                {pos ? "+" : ""}{chg.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DownloadBtn({ icon: Icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <button className="glass hover:border-primary/40 rounded-lg px-3 py-2 flex items-center gap-2 transition-all text-left">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <div className="text-[9px] text-muted-foreground leading-none">Download on</div>
        <div className="text-sm font-bold leading-tight">{label}</div>
        <div className="text-[9px] text-muted-foreground">{sub}</div>
      </div>
    </button>
  );
}

function QrPattern() {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const x = i % 21, y = Math.floor(i / 21);
    const isCorner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const cornerEdge = isCorner && (x === 0 || y === 0 || x === 6 || y === 6 || x === 14 || x === 20 || y === 14 || y === 20);
    const inner = isCorner && x >= 2 && x <= 4 && y >= 2 && y <= 4;
    const inner2 = isCorner && x >= 16 && x <= 18 && y >= 2 && y <= 4;
    const inner3 = isCorner && x >= 2 && x <= 4 && y >= 16 && y <= 18;
    const filled = cornerEdge || inner || inner2 || inner3 || (!isCorner && ((x * 7 + y * 13 + x * y) % 5 < 2));
    return filled;
  });
  return (
    <div className="grid grid-cols-[repeat(21,1fr)] gap-px w-full h-full">
      {cells.map((on, i) => <div key={i} className={on ? "bg-foreground" : "bg-transparent"} />)}
    </div>
  );
}
