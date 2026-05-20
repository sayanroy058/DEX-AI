import { AppShell } from "@/components/AppShell";
import { useMarkets } from "@/lib/useMarkets";
import { formatCompact, formatPrice, AssetClass, MarketKind } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Search, Flame, Bitcoin, DollarSign, Droplet, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const ASSET_TABS: { id: AssetClass | "all"; label: string; icon: any; kinds: (MarketKind | "all")[] }[] = [
  { id: "all", label: "All", icon: Flame, kinds: ["all"] },
  { id: "crypto", label: "Crypto", icon: Bitcoin, kinds: ["all", "spot", "perp", "options"] },
  { id: "forex", label: "Forex", icon: DollarSign, kinds: ["all", "perp"] },
  { id: "commodity", label: "Commodity", icon: Droplet, kinds: ["all", "perp"] },
  { id: "stocks", label: "Stocks", icon: Briefcase, kinds: ["all", "spot", "perp", "options"] },
];

const KIND_LABEL: Record<string, string> = { all: "All", spot: "Spot", perp: "Future", options: "Options" };

const Markets = () => {
  const markets = useMarkets();
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState<AssetClass | "all">("all");
  const [kind, setKind] = useState<MarketKind | "all">("all");

  const activeAsset = ASSET_TABS.find(a => a.id === asset)!;

  const filtered = useMemo(() => {
    let list = markets;
    if (asset !== "all") list = list.filter(m => m.asset === asset);
    if (kind !== "all") list = list.filter(m => m.category === kind);
    if (query) list = list.filter(m => m.symbol.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [markets, query, asset, kind]);

  const totalVol = markets.reduce((s, m) => s + m.volume24h, 0);
  const trending = [...markets].filter(m => m.trending).sort((a, b) => b.volume24h - a.volume24h).slice(0, 10);
  const gainers = [...markets].sort((a, b) => b.change24h - a.change24h).slice(0, 10);
  const losers = [...markets].sort((a, b) => a.change24h - b.change24h).slice(0, 10);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time prices across {markets.length} pairs · ${formatCompact(totalVol)} 24h volume</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ListCard title="🔥 Today's Top / Trending" items={trending} icon={Flame} />
          <ListCard title="🚀 Top Gainers" items={gainers} icon={TrendingUp} tone="buy" />
          <ListCard title="🩸 Top Losers" items={losers} icon={TrendingDown} tone="sell" />
        </div>

        {/* Asset class tabs */}
        <div className="glass rounded-xl p-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {ASSET_TABS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setAsset(a.id); setKind("all"); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
                      asset === a.id
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <a.icon className="h-3.5 w-3.5" /> {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 glass-strong px-2.5 py-1 rounded-md min-w-52">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search symbol..."
                className="h-6 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
              {activeAsset.kinds.map(k => (
                <button
                   key={k}
                   onClick={() => setKind(k as any)}
                   className={cn(
                     "px-2.5 py-1 rounded text-[11px] font-medium transition-colors",
                     kind === k ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                   )}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="md:hidden flex items-center gap-2 glass-strong px-2.5 py-1 rounded-md w-full sm:w-[165px] shrink-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-6 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 w-full"
              />
            </div>
          </div>
        </div>

        {/* All markets table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3">Pair</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">24h Change</th>
                  <th className="text-right">24h Volume</th>
                  <th className="text-right">Open Interest</th>
                  <th className="text-right pr-4">Funding</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.symbol} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link to="/trade" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-[10px] text-primary-foreground">
                          {m.base.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-semibold group-hover:text-primary transition-colors">{m.symbol}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{m.asset} · {m.category}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="text-right font-mono">${formatPrice(m.price)}</td>
                    <td className={cn("text-right font-mono font-semibold", m.change24h >= 0 ? "text-buy" : "text-sell")}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        {m.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right font-mono text-muted-foreground">${formatCompact(m.volume24h)}</td>
                    <td className="text-right font-mono text-muted-foreground">{m.openInterest ? `$${formatCompact(m.openInterest)}` : "—"}</td>
                    <td className={cn("text-right pr-4 font-mono", m.funding === undefined ? "" : m.funding >= 0 ? "text-buy" : "text-sell")}>
                      {m.funding !== undefined ? `${m.funding >= 0 ? "+" : ""}${(m.funding * 100).toFixed(4)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

function ListCard({ title, items, tone, icon: Icon }: { title: string; items: any[]; tone?: "buy" | "sell"; icon: any }) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </h3>
      <div className="space-y-1">
        {items.map((m, i) => (
          <Link key={m.symbol} to="/trade" className="flex items-center justify-between hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
              <span className="font-semibold text-sm truncate">{m.symbol}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-muted-foreground">${formatPrice(m.price)}</span>
              <span className={cn("font-bold w-16 text-right", (tone ?? (m.change24h >= 0 ? "buy" : "sell")) === "buy" ? "text-buy" : "text-sell")}>
                {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Markets;
