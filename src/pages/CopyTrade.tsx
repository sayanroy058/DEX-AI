import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Copy as CopyIcon, ChevronDown, Globe, Shield, TrendingUp, Bot } from "lucide-react";

// Mini SVG sparkline helper
function Sparkline({ data, color = "#00d4aa", height = 40 }: { data: number[]; color?: string; height?: number }) {
  const w = 80;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Win rate progress bar
function WinBar({ pct, color = "#00d4aa" }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono w-10">{pct}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden" style={{ minWidth: 60 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const FEATURED = [
  {
    id: "alphawolf",
    name: "AlphaWolf",
    initials: "AW",
    color: "#f97316",
    risk: "HIGH RISK",
    riskColor: "#ef4444",
    riskBg: "rgba(239,68,68,0.15)",
    region: "GLOBAL",
    copiers: "1,240",
    pnl: "+124.5%",
    aum: "$2.4M",
    sparkData: [30, 45, 38, 60, 55, 80, 70, 95, 88, 110, 105, 124],
    sparkColor: "#00d4aa",
  },
  {
    id: "quantqueen",
    name: "QuantQueen",
    initials: "QQ",
    color: "#8b5cf6",
    risk: "LOW RISK",
    riskColor: "#00d4aa",
    riskBg: "rgba(0,212,170,0.15)",
    region: "GLOBAL",
    copiers: "3,821",
    pnl: "+42.1%",
    aum: "$8.1M",
    sparkData: [10, 18, 15, 25, 22, 30, 28, 35, 32, 40, 38, 42],
    sparkColor: "#00d4aa",
  },
  {
    id: "arbavenger",
    name: "ArbAvenger",
    initials: "AA",
    color: "#ec4899",
    risk: "MED RISK",
    riskColor: "#f59e0b",
    riskBg: "rgba(245,158,11,0.15)",
    region: "GLOBAL",
    copiers: "942",
    pnl: "+68.4%",
    aum: "$1.2M",
    sparkData: [20, 35, 28, 45, 40, 55, 50, 60, 58, 65, 62, 68],
    sparkColor: "#00d4aa",
  },
  {
    id: "moonrunner",
    name: "MoonRunner",
    initials: "MR",
    color: "#06b6d4",
    risk: "HIGH RISK",
    riskColor: "#ef4444",
    riskBg: "rgba(239,68,68,0.15)",
    region: "GLOBAL",
    copiers: "2,105",
    pnl: "+89.2%",
    aum: "$4.7M",
    sparkData: [40, 30, 50, 45, 70, 60, 80, 75, 85, 82, 88, 89],
    sparkColor: "#00d4aa",
  },
];

const TRADERS = [
  { rank: 1, medal: "gold", name: "AlphaWolf", region: "GLOBAL", roi30: "+124.52%", roi7: "+12.16%", winRate: 84.5, followers: "1,240", aum: "$2.41M", sharpe: 3.2, sparkData: [30, 45, 60, 55, 80, 70, 95, 110, 124], sparkColor: "#00d4aa", initials: "AW", color: "#f97316" },
  { rank: 2, medal: "silver", name: "MoonRunner", region: "EU", roi30: "+89.21%", roi7: "+4.52%", winRate: 72.1, followers: "2,105", aum: "$4.72M", sharpe: 2.8, sparkData: [20, 35, 50, 45, 60, 55, 70, 80, 89], sparkColor: "#00d4aa", initials: "MR", color: "#06b6d4" },
  { rank: 3, medal: "bronze", name: "DegenLabs", region: "ASIA", roi30: "+76.40%", roi7: "-2.15%", winRate: 64.8, followers: "842", aum: "$1.15M", sharpe: 2.1, sparkData: [40, 55, 65, 50, 60, 70, 65, 72, 76], sparkColor: "#ef4444", initials: "DL", color: "#10b981" },
  { rank: 4, medal: null, name: "SatoshiNakam0to", region: "UNKNOWN", roi30: "+62.15%", roi7: "+8.42%", winRate: 91.2, followers: "5,102", aum: "$12.4M", sharpe: 4.5, sparkData: [10, 25, 35, 30, 45, 50, 55, 60, 62], sparkColor: "#00d4aa", initials: "SN", color: "#6366f1" },
  { rank: 5, medal: null, name: "QuantQueen", region: "US", roi30: "+42.10%", roi7: "+1.05%", winRate: 94.5, followers: "3,821", aum: "$8.12M", sharpe: 5.1, sparkData: [5, 12, 18, 22, 28, 32, 36, 40, 42], sparkColor: "#00d4aa", initials: "QQ", color: "#8b5cf6" },
  { rank: 6, medal: null, name: "ArbAvenger", region: "GLOBAL", roi30: "+38.12%", roi7: "+5.12%", winRate: 78.4, followers: "942", aum: "$1.21M", sharpe: 2.9, sparkData: [8, 15, 20, 25, 28, 32, 35, 37, 38], sparkColor: "#00d4aa", initials: "AA", color: "#ec4899" },
  { rank: 7, medal: null, name: "BlockchainBaron", region: "UK", roi30: "+31.05%", roi7: "+0.45%", winRate: 61.2, followers: "1,540", aum: "$3.12M", sharpe: 1.8, sparkData: [5, 10, 18, 22, 25, 27, 29, 30, 31], sparkColor: "#00d4aa", initials: "BB", color: "#f59e0b" },
  { rank: 8, medal: null, name: "DeltaHunter", region: "ASIA", roi30: "+28.45%", roi7: "-1.10%", winRate: 58.9, followers: "420", aum: "$0.84M", sharpe: 1.4, sparkData: [15, 20, 25, 22, 24, 26, 27, 28, 28], sparkColor: "#ef4444", initials: "DH", color: "#ef4444" },
  { rank: 9, medal: null, name: "YieldFarmer", region: "EU", roi30: "+19.20%", roi7: "+2.15%", winRate: 98.2, followers: "2,410", aum: "$9.41M", sharpe: 6.2, sparkData: [2, 5, 8, 10, 13, 15, 17, 18, 19], sparkColor: "#00d4aa", initials: "YF", color: "#84cc16" },
  { rank: 10, medal: null, name: "PepeWhale", region: "MEMES", roi30: "+12.45%", roi7: "-8.12%", winRate: 45.1, followers: "12,410", aum: "$0.45M", sharpe: 0.5, sparkData: [20, 25, 18, 12, 15, 10, 8, 12, 12], sparkColor: "#ef4444", initials: "PW", color: "#22c55e" },
];

const MARKET_CATEGORY_TABS = {
  Crypto: ["Spot", "Future", "Options", "AI Bots"],
  Forex: ["Options", "AI Bots"],
  Commodity: ["Options", "AI Bots"],
  Stocks: ["Spot", "Future", "Options", "AI Bots"],
} as const;

const MARKET_CATEGORIES = Object.keys(MARKET_CATEGORY_TABS) as Array<keyof typeof MARKET_CATEGORY_TABS>;
type MarketCategory = (typeof MARKET_CATEGORIES)[number];
type AssetTab = (typeof MARKET_CATEGORY_TABS)[MarketCategory][number];

const FILTER_TABS = ["ROI 30D", "Risk Level", "Followers", "Win Rate", "Asset Class"] as const;

function MedalIcon({ medal }: { medal: string | null }) {
  if (medal === "gold") return <span className="text-yellow-400 text-lg">🏆</span>;
  if (medal === "silver") return <span className="text-gray-300 text-lg">🥈</span>;
  if (medal === "bronze") return <span className="text-orange-400 text-lg">🥉</span>;
  return null;
}

const CopyTrade = () => {
  const [activeMarketCategory, setActiveMarketCategory] = useState<MarketCategory>("Crypto");
  const [activeTab, setActiveTab] = useState<AssetTab>("Spot");
  const [activeFilter, setActiveFilter] = useState("ROI 30D");
  const [copying, setCopying] = useState<Set<string>>(new Set());
  const activeAssetTabs = MARKET_CATEGORY_TABS[activeMarketCategory];

  useEffect(() => {
    if (!activeAssetTabs.includes(activeTab as never)) {
      setActiveTab(activeAssetTabs[0]);
    }
  }, [activeAssetTabs, activeTab]);

  const toggleCopy = (name: string) => {
    setCopying(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        toast.info(`Stopped copying ${name}`);
      } else {
        next.add(name);
        toast.success(`Now copying ${name}`, { description: "Trades will be mirrored to your account." });
      }
      return next;
    });
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Copy Trading</h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest"
            style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5)", color: "#fff" }}>
            PRO
          </span>
        </div>
        <p className="text-muted-foreground text-sm -mt-4">Mirror the best traders on DEX.ai with one tap.</p>

        {/* Top categories */}
        <div className="flex items-center gap-2 border-b border-border/30 pb-1 flex-wrap">
          {MARKET_CATEGORIES.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveMarketCategory(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeMarketCategory === tab
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={activeMarketCategory === tab ? { background: "linear-gradient(90deg,#0ea5e9,#2563eb)" } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Under category options */}
        <div className="flex items-center gap-2 border-b border-border/30 pb-1 flex-wrap">
          {activeAssetTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={activeTab === tab ? { background: "linear-gradient(90deg,#7c3aed,#4f46e5)" } : {}}
            >
              {tab === "AI Bots" && <Bot className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Featured cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED.map(f => (
            <div key={f.id} className="rounded-xl p-4 flex flex-col gap-2 border border-white/10"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: f.color }}>
                    {f.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm">{f.name}</span>
                      <Shield className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Globe className="h-2.5 w-2.5" />
                      {f.region} · {f.copiers} COPIERS
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0"
                  style={{ background: f.riskBg, color: f.riskColor }}>
                  {f.risk}
                </span>
              </div>

              {/* PNL & AUM */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground">PNL (30D)</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: "#00d4aa" }}>{f.pnl}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">AUM</div>
                  <div className="text-sm font-bold font-mono text-foreground">{f.aum}</div>
                </div>
              </div>

              {/* Time tabs */}
              <div className="flex gap-1 text-[10px] text-muted-foreground">
                <span>Today</span>
                <span className="text-white bg-white/15 px-1 rounded">7D</span>
                <span>30D</span>
                <span>90D</span>
              </div>

              {/* Sparkline */}
              <div className="h-10 w-full">
                <svg width="100%" height="40" viewBox="0 0 80 40" preserveAspectRatio="none">
                  {(() => {
                    const d = f.sparkData;
                    const min = Math.min(...d);
                    const max = Math.max(...d);
                    const range = max - min || 1;
                    const pts = d.map((v, i) => `${(i / (d.length - 1)) * 80},${40 - ((v - min) / range) * 36}`).join(" ");
                    return <polyline points={pts} stroke={f.sparkColor} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />;
                  })()}
                </svg>
              </div>

              {/* Copy button */}
              <button
                onClick={() => toggleCopy(f.name)}
                className={cn(
                  "w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                  copying.has(f.name)
                    ? "bg-white/10 text-muted-foreground"
                    : "text-white"
                )}
                style={!copying.has(f.name) ? { background: "linear-gradient(90deg,#7c3aed,#4f46e5)" } : {}}
              >
                <CopyIcon className="h-3.5 w-3.5" />
                {copying.has(f.name) ? "Following" : "Copy Trader"}
              </button>
            </div>
          ))}
        </div>

        {/* Filter tabs + sort */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_TABS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  activeFilter === f
                    ? "border-transparent text-white"
                    : "border-white/10 text-muted-foreground hover:text-foreground"
                )}
                style={activeFilter === f ? { background: "linear-gradient(90deg,#7c3aed,#4f46e5)" } : {}}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            <span>SORT BY</span>
            <button className="flex items-center gap-1 border border-white/15 rounded px-2 py-1 hover:bg-white/5">
              Popularity <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="overflow-x-auto scrollbar-none">
            <div className="min-w-[950px]">
              {/* Table header */}
              <div className="grid items-center text-[10px] font-semibold text-muted-foreground tracking-widest uppercase px-4 py-3 border-b border-white/10"
                style={{ gridTemplateColumns: "48px 1fr 100px 90px 160px 90px 90px 70px 100px 80px" }}>
                <span>RANK</span>
                <span>TRADER</span>
                <span>ROI 30D</span>
                <span>ROI 7D</span>
                <span>WIN RATE</span>
                <span>FOLLOWERS</span>
                <span>AUM</span>
                <span>SHARPE</span>
                <span>PERFORMANCE</span>
                <span></span>
              </div>

              {TRADERS.map((t, idx) => (
                <div
                  key={t.name}
                  className="grid items-center px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                  style={{ gridTemplateColumns: "48px 1fr 100px 90px 160px 90px 90px 70px 100px 80px" }}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    {t.medal ? <MedalIcon medal={t.medal} /> : <span className="text-sm text-muted-foreground font-mono">{t.rank}</span>}
                  </div>

                  {/* Trader */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: t.color }}>
                      {t.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold truncate">{t.name}</span>
                        <Shield className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Globe className="h-2.5 w-2.5" />
                        {t.region}
                      </div>
                    </div>
                  </div>

                  {/* ROI 30D */}
                  <span className="text-sm font-mono font-bold" style={{ color: "#00d4aa" }}>{t.roi30}</span>

                  {/* ROI 7D */}
                  <span className={cn("text-sm font-mono font-bold", t.roi7.startsWith("-") ? "text-red-400" : "text-green-400")}>
                    {t.roi7}
                  </span>

                  {/* Win rate */}
                  <WinBar pct={t.winRate} color="#00d4aa" />

                  {/* Followers */}
                  <span className="text-sm font-mono text-foreground">{t.followers}</span>

                  {/* AUM */}
                  <span className="text-sm font-mono text-foreground">{t.aum}</span>

                  {/* Sharpe */}
                  <span className="text-sm font-mono text-foreground">{t.sharpe}</span>

                  {/* Performance mini chart */}
                  <div>
                    <svg width="80" height="28" viewBox="0 0 80 28" fill="none">
                      {(() => {
                        const d = t.sparkData;
                        const min = Math.min(...d);
                        const max = Math.max(...d);
                        const range = max - min || 1;
                        const pts = d.map((v, i) => `${(i / (d.length - 1)) * 80},${28 - ((v - min) / range) * 24}`).join(" ");
                        return <polyline points={pts} stroke={t.sparkColor} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />;
                      })()}
                    </svg>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => toggleCopy(t.name)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      copying.has(t.name) ? "bg-white/10 text-muted-foreground" : "text-white"
                    )}
                    style={!copying.has(t.name) ? { background: "linear-gradient(90deg,#7c3aed,#4f46e5)" } : {}}
                  >
                    {copying.has(t.name) ? "Following" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default CopyTrade;
