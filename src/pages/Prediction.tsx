import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Timer, Flame, Globe, ArrowRight, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Macro: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Regulation: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  AI: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Tech: "bg-green-500/15 text-green-400 border-green-500/20",
};

export default function Prediction() {
  const [activeCat, setActiveCat] = useState("All");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("Top Volume");
  const [bannerIdx, setBannerIdx] = useState(0);

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
      <div className="max-w-7xl mx-auto p-6 space-y-8">

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
            <Button className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary shrink-0">
              Predict Now <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-1.5 mt-4">
            {BANNERS.map((_, i) => (
              <button key={i} onClick={() => setBannerIdx(i)} className={cn("h-1.5 rounded-full transition-all", i === bannerIdx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40")} />
            ))}
          </div>
        </div>

        {/* Market type tabs + filter */}
        <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-r from-[#0a1533] to-[#0a1328]">
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setActiveCat(c)} className={cn(
                "px-3 py-1.5 text-xs rounded-md border transition-all",
                activeCat === c ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:bg-muted/40"
              )}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {FILTERS.map(filter => (
              <button key={filter} onClick={() => setActiveFilter(filter)} className={cn(
                "px-3 py-1 text-[11px] rounded-full border transition-all",
                activeFilter === filter ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:bg-muted/40"
              )}>{filter}</button>
            ))}
          </div>
        </div>

        {/* Hot markets */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Hot Markets
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-2">
            {filtered.slice(0, 3).map(m => <MarketCard key={m.q} m={m} featured />)}
          </div>
        </div>

        {/* Category filter + all markets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> All Markets</h2>
            <span className="text-xs text-muted-foreground">Filter: {activeFilter}</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => <MarketCard key={m.q} m={m} />)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MarketCard({ m, featured }: { m: typeof markets[0]; featured?: boolean }) {
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
        <Button size="sm" className="bg-buy/15 text-buy hover:bg-buy/25 border border-buy/30 h-8 text-xs">Buy YES</Button>
        <Button size="sm" className="bg-sell/15 text-sell hover:bg-sell/25 border border-sell/30 h-8 text-xs">Buy NO</Button>
      </div>
    </div>
  );
}
