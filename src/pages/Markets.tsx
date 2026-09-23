import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IndexedMarket, useMarketIndexes } from "@/lib/useMarketIndexes";
import { AssetClass, formatCompact, formatPrice, MarketKind } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  Bitcoin,
  Briefcase,
  DollarSign,
  Droplet,
  Flame,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type MarketIcon = ComponentType<{ className?: string }>;

// comingSoon: crypto-only for the current launch (2026-09-11 product
// decision) — see MarketList.tsx's identical flag for the full explanation
// of what's disabled-not-deleted underneath these tabs.
// Forex/Commodity/Stocks tabs removed and Options kind hidden (2026-09-17:
// product decision — don't advertise unavailable markets with Soon badges,
// same change as MarketList.tsx on the trade page). Commented out, not
// deleted — restore these entries to bring the tabs back. The underlying
// implementations still live (see backendMarkets.ts,
// matching-engine/cmd/engine/markets.go's disabledMarkets, and
// Price-Fetcher's DefaultInstruments).
const ASSET_TABS: { id: AssetClass | "all"; label: string; icon: MarketIcon; kinds: (MarketKind | "all")[]; comingSoon?: boolean }[] = [
  { id: "all", label: "All", icon: Flame, kinds: ["all"] },
  { id: "crypto", label: "Crypto", icon: Bitcoin, kinds: ["all", "spot", "perp"] },
  // { id: "forex", label: "Forex", icon: DollarSign, kinds: ["all", "perp"], comingSoon: true },
  // { id: "commodity", label: "Commodity", icon: Droplet, kinds: ["all", "perp"], comingSoon: true },
  // { id: "stocks", label: "Stocks", icon: Briefcase, kinds: ["all", "perp", "options"], comingSoon: true },
];

const KIND_LABEL: Record<string, string> = { all: "All", spot: "Spot", perp: "Future", options: "Options" };

// Options trading is DISABLED (2026-09-11 product decision: crypto
// spot/futures only for the current launch) — kept as a DATA-LEVEL filter
// only (it removes options-category markets from the "All" table via
// filteredMarkets below). The Options kind sub-tab itself is hidden by
// dropping "options" from Crypto's kinds list above (2026-09-17), same as
// the trade page. See matching-engine/cmd/engine/markets.go's optionsEnabled
// for the backend-side gate.
const COMING_SOON_KINDS = new Set<MarketKind>(["options"]);

const Markets = () => {
  const { markets, loading } = useMarketIndexes();
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState<AssetClass | "all">("all");
  const [kind, setKind] = useState<MarketKind | "all">("all");
  const activeAsset = ASSET_TABS.find((item) => item.id === asset)!;

  const comingSoonAssets = useMemo(
    () => new Set(ASSET_TABS.filter((item) => item.comingSoon).map((item) => item.id)),
    []
  );

  const filtered = useMemo(() => {
    // Coming-soon asset classes AND kinds are excluded everywhere, including
    // "All" — Price-Fetcher no longer prices non-crypto instruments
    // (DefaultInstruments is empty) and options order submission is rejected
    // engine-side, so these would otherwise show as permanently
    // "unavailable"/tradable-looking rather than being cleanly absent.
    // Also exclude any pair with no live index price at all — a disabled/
    // never-listed instrument otherwise shows a permanent "—" row with an
    // "unavailable" badge instead of being cleanly absent from the table.
    let list = markets.filter(
      (market) => !comingSoonAssets.has(market.asset) && !COMING_SOON_KINDS.has(market.category) && market.price !== null
    );
    if (asset !== "all") list = list.filter((market) => market.asset === asset);
    if (kind !== "all") list = list.filter((market) => market.category === kind);
    if (query) list = list.filter((market) => market.symbol.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [markets, query, asset, kind, comingSoonAssets]);

  // Spot, futures, and options rows can share one underlying index. Count and
  // rank each Price-Fetcher feed once so BTC volume is not triple-counted.
  const uniqueFeeds = useMemo(() => {
    const byBase = new Map<string, IndexedMarket>();
    markets.forEach((market) => {
      if (!byBase.has(market.base)) byBase.set(market.base, market);
    });
    return Array.from(byBase.values());
  }, [markets]);

  const liveFeeds = uniqueFeeds.filter((market) => market.dataStatus === "live" && market.price !== null);
  const ranked = liveFeeds.filter((market) => market.change24h !== null);
  const trending = [...ranked]
    .sort((left, right) => Math.abs(right.change24h ?? 0) - Math.abs(left.change24h ?? 0))
    .slice(0, 10);
  const gainers = [...ranked]
    .filter((market) => (market.change24h ?? 0) > 0)
    .sort((left, right) => (right.change24h ?? 0) - (left.change24h ?? 0))
    .slice(0, 10);
  const losers = [...ranked]
    .filter((market) => (market.change24h ?? 0) < 0)
    .sort((left, right) => (left.change24h ?? 0) - (right.change24h ?? 0))
    .slice(0, 10);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ListCard title="Today's Top / Trending" items={trending} icon={Flame} loading={loading} />
          <ListCard title="Top Gainers" items={gainers} icon={TrendingUp} tone="buy" loading={loading} />
          <ListCard title="Top Losers" items={losers} icon={TrendingDown} tone="sell" loading={loading} />
        </div>

        <div className="glass rounded-xl p-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {ASSET_TABS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setAsset(item.id); setKind("all"); }}
                    className={cn(
                      "relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
                      asset === item.id
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                    {item.comingSoon && (
                      <span className="px-1.5 py-px rounded-full bg-warning/15 text-warning text-[9px] font-bold leading-none">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <SearchBox query={query} setQuery={setQuery} className="hidden md:flex min-w-52" />
          </div>

          {!activeAsset.comingSoon && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
                {activeAsset.kinds.map((marketKind) => (
                  <button
                    key={marketKind}
                    onClick={() => setKind(marketKind)}
                    className={cn(
                      "px-2.5 py-1 rounded text-[11px] font-medium transition-colors",
                      kind === marketKind
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    {KIND_LABEL[marketKind]}
                    {marketKind !== "all" && COMING_SOON_KINDS.has(marketKind as MarketKind) && (
                      <span className="ml-1 text-warning text-[9px] font-bold">Soon</span>
                    )}
                  </button>
                ))}
              </div>
              <SearchBox query={query} setQuery={setQuery} className="md:hidden w-full sm:w-[165px] shrink-0" />
            </div>
          )}
        </div>

        {activeAsset.comingSoon || (kind !== "all" && COMING_SOON_KINDS.has(kind as MarketKind)) ? (
          <div className="glass rounded-xl p-12 flex flex-col items-center justify-center gap-2 text-center">
            <activeAsset.icon className="h-8 w-8 text-muted-foreground/50" />
            <div className="text-sm font-semibold text-foreground">
              {activeAsset.comingSoon ? activeAsset.label : KIND_LABEL[kind]} — Coming Soon
            </div>
            <div className="text-xs text-muted-foreground max-w-sm">
              {activeAsset.comingSoon
                ? `${activeAsset.label} trading isn't live on the exchange yet. Check back soon, or trade Crypto today.`
                : `${KIND_LABEL[kind]} trading isn't live on the exchange yet. Check back soon, or trade Spot/Futures today.`}
            </div>
          </div>
        ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3">Pair</th>
                  <th className="text-right">Index Price</th>
                  <th className="text-right">24h Change</th>
                  <th className="text-right pr-4">24h Volume</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((market) => (
                  <tr key={market.symbol} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link to="/trade" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-[10px] text-primary-foreground">
                          {market.base.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-semibold group-hover:text-primary transition-colors">{market.symbol}</div>
                          <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5">
                            {market.asset} · {market.category}
                            <DataStatus status={market.dataStatus} updatedAt={market.updatedAt} />
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="text-right font-mono">
                      {market.price === null ? "—" : `$${formatPrice(market.price)}`}
                    </td>
                    <td className={cn(
                      "text-right font-mono font-semibold",
                      market.change24h === null ? "text-muted-foreground" : market.change24h >= 0 ? "text-buy" : "text-sell",
                    )}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        {market.change24h === null ? "—" : (
                          <>
                            {market.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(2)}%
                          </>
                        )}
                      </span>
                    </td>
                    <td className="text-right pr-4 font-mono text-muted-foreground">
                      {market.volume24h === null ? "N/A" : `$${formatCompact(market.volume24h)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </AppShell>
  );
};

function SearchBox({ query, setQuery, className }: { query: string; setQuery: (value: string) => void; className?: string }) {
  return (
    <div className={cn("items-center gap-2 glass-strong px-2.5 py-1 rounded-md", className)}>
      <Search className="h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search symbol…"
        className="h-6 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 w-full"
      />
    </div>
  );
}

function ListCard({
  title,
  items,
  tone,
  icon: Icon,
  loading,
}: {
  title: string;
  items: IndexedMarket[];
  tone?: "buy" | "sell";
  icon: MarketIcon;
  loading: boolean;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </h3>
      <div className="space-y-1">
        {loading && Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-full rounded" />
        ))}
        {!loading && items.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No live data available</p>
        )}
        {!loading && items.map((market, index) => (
          <Link key={market.base} to="/trade" className="flex items-center justify-between hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-muted-foreground w-4">{index + 1}</span>
              <span className="font-semibold text-sm truncate">{market.symbol}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-muted-foreground">{market.price === null ? "—" : `$${formatPrice(market.price)}`}</span>
              <span className={cn(
                "font-bold w-16 text-right",
                (tone ?? ((market.change24h ?? 0) >= 0 ? "buy" : "sell")) === "buy" ? "text-buy" : "text-sell",
              )}>
                {market.change24h === null ? "—" : `${market.change24h >= 0 ? "+" : ""}${market.change24h.toFixed(2)}%`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DataStatus({ status, updatedAt }: { status: IndexedMarket["dataStatus"]; updatedAt: number | null }) {
  const age = updatedAt ? Math.max(0, Math.floor((Date.now() - updatedAt) / 1_000)) : null;
  return (
    <span
      className={cn(
        "normal-case rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
        status === "live" && "bg-buy/10 text-buy",
        status === "stale" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        status === "unavailable" && "bg-muted text-muted-foreground",
      )}
      title={age === null ? "No update received" : `Updated ${age}s ago`}
    >
      {status}
    </span>
  );
}

export default Markets;
