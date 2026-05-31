import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Zap, Trophy, Timer, Flame, Globe, ArrowRight, Users, Clock, LayoutGrid, CalendarDays, BarChart2, TrendingUp, ClipboardList, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PredictionDetailModal } from "@/components/trade/PredictionDetailModal";
import { predictionOrders, predictionSidePillClass, predictionStatusClass, type PredictionOrderSummary } from "@/lib/predictionOrders";

const BANNERS = [
  { title: "Bitcoin halving aftermath — will BTC hit $120K?", sub: "Join 8,400+ traders predicting the next move", volume: "$14.2M pool", tag: "🔥 Trending", color: "from-orange-500/20 to-yellow-500/10 border-orange-500/30" },
  { title: "Fed rate decision — markets on edge", sub: "Next FOMC meeting: June 18 — make your call", volume: "$6.8M pool", tag: "⚡ Live", color: "from-primary/20 to-blue-500/10 border-primary/30" },
  { title: "ETH ETF: Will it get approved this quarter?", sub: "Regulatory decision expected — high volatility", volume: "$5.1M pool", tag: "🌟 Featured", color: "from-purple-500/20 to-pink-500/10 border-purple-500/30" },
];

const STATS = [
  { icon: Users, label: "Active Traders", value: "28,400+" },
  { icon: Globe, label: "Total Volume", value: "$142M+" },
  { icon: Trophy, label: "Avg. Payout", value: "2.4x" },
  { icon: Flame, label: "Markets", value: "340+" },
];

const markets = [
  { q: "Will BTC close above $80k by year-end?", yes: 62, vol: "$4.2M", end: "Dec 31", category: "Crypto", participants: 1240, marketType: "Global" },
  { q: "ETH ETF approved by Q3 2026?", yes: 48, vol: "$2.1M", end: "Sep 30", category: "Regulation", participants: 890, marketType: "Stock" },
  { q: "Will Fed cut rates next meeting?", yes: 71, vol: "$1.8M", end: "Jun 18", category: "Macro", participants: 2100, marketType: "Global" },
  { q: "SOL > $300 by Aug?", yes: 34, vol: "$980K", end: "Aug 31", category: "Crypto", participants: 560, marketType: "Crypto" },
  { q: "New AI token in top 10 by Q4?", yes: 56, vol: "$640K", end: "Oct 31", category: "AI", participants: 340, marketType: "More" },
  { q: "BTC dominance > 60%?", yes: 41, vol: "$1.2M", end: "Jul 15", category: "Crypto", participants: 780, marketType: "Crypto" },
  { q: "US recession confirmed in 2026?", yes: 29, vol: "$2.4M", end: "Dec 31", category: "Macro", participants: 1560, marketType: "Global" },
  { q: "Will Ethereum flip Bitcoin in market cap?", yes: 18, vol: "$890K", end: "Dec 31", category: "Crypto", participants: 420, marketType: "Crypto" },
  { q: "Apple launch crypto wallet by EOY?", yes: 22, vol: "$540K", end: "Dec 31", category: "Tech", participants: 290, marketType: "Stock" },
];

const CATEGORIES = ["All", "Crypto", "Stock", "Global", "More"] as const;
const FILTERS = ["Top Volume", "Ending Soon", "Most Active"] as const;

const TIME_FILTERS = [
  { label: "All", count: 317, icon: LayoutGrid },
  { label: "5 Min", count: 7, icon: Clock },
  { label: "15 Min", count: 7, icon: Clock },
  { label: "1 Hour", count: 9, icon: Clock },
  { label: "4 Hours", count: 7, icon: Clock },
  { label: "Daily", count: 11, icon: CalendarDays },
  { label: "Weekly", count: 61, icon: BarChart2 },
  { label: "Monthly", count: 24, icon: TrendingUp },
  { label: "Yearly", count: 23, icon: CalendarDays },
  { label: "Pre-Market", count: 100, icon: Zap },
  { label: "ETF", count: 2, icon: TrendingUp },
] as const;

const COIN_FILTERS = [
  { label: "Bitcoin", count: 36, color: "bg-orange-500" },
  { label: "Ethereum", count: 20, color: "bg-blue-500" },
  { label: "Solana", count: 13, color: "bg-purple-500" },
  { label: "XRP", count: 11, color: "bg-gray-500" },
  { label: "BNB", count: 8, color: "bg-yellow-500" },
  { label: "DOGE", count: 6, color: "bg-yellow-400" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Macro: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Regulation: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  AI: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Tech: "bg-green-500/15 text-green-400 border-green-500/20",
};

function PredictionOrdersPopover({
  orders,
  onViewAll,
}: {
  orders: PredictionOrderSummary[];
  onViewAll: () => void;
}) {
  const openOrders = orders.filter((order) => order.status === "Open");
  const recent = orders.slice(0, 3);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary">
          <ClipboardList className="h-4 w-4" />
          Orders
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,460px)] border-border/50 bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="text-sm font-semibold">Open Predictions ({openOrders.length})</div>
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">No Records Found</div>
          ) : (
            <div className="divide-y divide-border/30">
              {recent.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={onViewAll}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/25"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={predictionSidePillClass(order.side)}>{order.side}</span>
                      <span className="truncate text-xs font-semibold">{order.market}</span>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${predictionStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">{order.id}</span>
                    <span className="text-right font-mono">{order.price}c | {order.shares.toFixed(2)} shares</span>
                    <span className="text-muted-foreground">{order.date}</span>
                    <span className="text-right font-mono">${order.cost.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Prediction() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState("All");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("Top Volume");
  const [bannerIdx, setBannerIdx] = useState(0);
  const [activeTimeFilter, setActiveTimeFilter] = useState("All");
  const [activeCoin, setActiveCoin] = useState<string | null>(null);
  const [detailMarket, setDetailMarket] = useState<typeof markets[0] | null>(null);
  const [detailSide, setDetailSide] = useState<"YES" | "NO">("YES");

  const openDetail = (m: typeof markets[0], side: "YES" | "NO") => {
    setDetailMarket(m);
    setDetailSide(side);
  };

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const typeFiltered = activeCat === "All" ? markets : markets.filter(m => m.marketType === activeCat);
  const filtered = [...typeFiltered].sort((a, b) => {
    if (activeFilter === "Top Volume") return parseFloat(b.vol.replace(/[^0-9.]/g, "")) - parseFloat(a.vol.replace(/[^0-9.]/g, ""));
    if (activeFilter === "Ending Soon") return a.end.localeCompare(b.end);
    return b.participants - a.participants;
  });

  return (
    <AppShell>
      {detailMarket && (
        <PredictionDetailModal
          market={detailMarket}
          initialSide={detailSide}
          onClose={() => setDetailMarket(null)}
        />
      )}
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="flex gap-6">

          {/* Left sidebar — time & coin filters */}
          <aside className="hidden lg:flex flex-col gap-0 w-52 shrink-0">
            <div className="glass rounded-xl overflow-hidden">
              {TIME_FILTERS.map((tf, idx) => (
                <button
                  key={tf.label}
                  onClick={() => setActiveTimeFilter(tf.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    idx !== 0 && "border-t border-border/30",
                    activeTimeFilter === tf.label
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <tf.icon className="h-4 w-4 opacity-70" />
                    {tf.label}
                  </span>
                  <span className={cn("text-xs tabular-nums", activeTimeFilter === tf.label ? "text-primary" : "text-muted-foreground/60")}>
                    {tf.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="glass rounded-xl overflow-hidden mt-3">
              <div className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                By Coin
              </div>
              {COIN_FILTERS.map((cf, idx) => (
                <button
                  key={cf.label}
                  onClick={() => setActiveCoin(activeCoin === cf.label ? null : cf.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    idx !== 0 && "border-t border-border/30",
                    activeCoin === cf.label
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0", cf.color)}>
                      {cf.label[0]}
                    </span>
                    {cf.label}
                  </span>
                  <span className={cn("text-xs tabular-nums", activeCoin === cf.label ? "text-primary" : "text-muted-foreground/60")}>
                    {cf.count}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prediction Markets</h1>
            <p className="text-sm text-muted-foreground">Track markets, place predictions, and review your purchases.</p>
          </div>
          <PredictionOrdersPopover
            orders={predictionOrders}
            onViewAll={() => navigate("/prediction/orders")}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-bold text-lg">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Auto-rotating banner */}
        <div className={cn("relative rounded-2xl border p-6 md:p-8 overflow-hidden transition-all duration-500 bg-gradient-to-r", BANNERS[bannerIdx].color)}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <span className="inline-block text-xs font-bold mb-2 px-2 py-0.5 rounded-full bg-background/30 border border-white/10">{BANNERS[bannerIdx].tag}</span>
              <h2 className="text-xl md:text-2xl font-bold mb-1">{BANNERS[bannerIdx].title}</h2>
              <p className="text-sm text-muted-foreground">{BANNERS[bannerIdx].sub}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-semibold text-primary">{BANNERS[bannerIdx].volume}</span>
                <Timer className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <Button className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full md:w-auto shrink-0">
              Predict Now <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-1.5 mt-4">
            {BANNERS.map((_, i) => (
              <button key={i} onClick={() => setBannerIdx(i)} className={cn("h-1.5 rounded-full transition-all", i === bannerIdx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
            ))}
          </div>
        </div>

        {/* Mobile time filter chips */}
        <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {TIME_FILTERS.map(tf => (
            <button key={tf.label} onClick={() => setActiveTimeFilter(tf.label)} className={cn(
              "px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5",
              activeTimeFilter === tf.label ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:bg-muted/40"
            )}>
              {tf.label} <span className="opacity-60">{tf.count}</span>
            </button>
          ))}
        </div>

        {/* Market type tabs + filter */}
        <div className="rounded-xl border border-border/50 p-3 bg-muted/40">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setActiveCat(c)} className={cn(
                "px-3 py-1.5 text-xs rounded-md border transition-all shrink-0",
                activeCat === c ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:bg-muted/40"
              )}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-none flex-nowrap">
            {FILTERS.map(filter => (
              <button key={filter} onClick={() => setActiveFilter(filter)} className={cn(
                "px-3 py-1 text-[11px] rounded-full border transition-all shrink-0",
                activeFilter === filter ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:bg-muted/40"
              )}>{filter}</button>
            ))}
          </div>
        </div>

        {/* Hot markets */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Hot Markets
            {activeTimeFilter !== "All" && (
              <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">{activeTimeFilter}</span>
            )}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-2">
            {filtered.slice(0, 3).map(m => <MarketCard key={m.q} m={m} featured onTrade={openDetail} />)}
          </div>
        </div>

        {/* All markets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> All Markets</h2>
            <span className="text-xs text-muted-foreground">Filter: {activeFilter}</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => <MarketCard key={m.q} m={m} onTrade={openDetail} />)}
          </div>
        </div>

          </div>{/* end main content */}
        </div>{/* end flex */}
      </div>
    </AppShell>
  );
}

function MarketCard({ m, featured, onTrade }: { m: typeof markets[0]; featured?: boolean; onTrade?: (m: typeof markets[0], side: "YES" | "NO") => void }) {
  return (
    <div className={cn(
      "glass rounded-xl p-5 hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5",
      featured && "border border-primary/20"
    )}>
      <div className="flex items-start justify-between mb-2">
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", CATEGORY_COLORS[m.category] ?? "bg-muted/20 text-muted-foreground border-border/30")}>
          {m.category}
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Timer className="h-2.5 w-2.5" /> {m.end}</span>
      </div>
      <div className="text-sm font-semibold mb-3 min-h-[2.5rem] leading-snug">{m.q}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>Vol {m.vol}</span>
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.participants.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-buy to-buy/70 transition-all duration-700" style={{ width: `${m.yes}%` }} />
      </div>
      <div className="flex justify-between text-[11px] mb-3">
        <span className="text-buy font-bold">YES {m.yes}¢</span>
        <span className="text-sell font-bold">NO {100 - m.yes}¢</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" onClick={() => onTrade?.(m, "YES")} className="bg-buy/15 text-buy hover:bg-buy/25 border border-buy/30 h-8 text-xs">YES</Button>
        <Button size="sm" onClick={() => onTrade?.(m, "NO")} className="bg-sell/15 text-sell hover:bg-sell/25 border border-sell/30 h-8 text-xs">NO</Button>
      </div>
    </div>
  );
}
