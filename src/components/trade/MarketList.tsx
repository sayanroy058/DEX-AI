import { useEffect, useMemo, useState } from "react";
import { useMarkets } from "@/lib/useMarkets";
import { formatPrice, AssetClass, MarketKind } from "@/lib/mockData";
import { Star, Search, ChevronLeft, ChevronRight, Bitcoin, DollarSign, Droplet, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// comingSoon marks an asset class as not yet tradable (2026-09-11 product
// decision: crypto-only for the current launch). The tab still renders so
// people know it's on the roadmap, but selecting it shows a "Coming Soon"
// placeholder instead of the market rows — nothing behind it is deleted,
// see backendMarkets.ts, matching-engine/cmd/engine/markets.go's
// disabledMarkets, and Price-Fetcher's DefaultInstruments for where the
// underlying implementation still lives.
// Forex/Commodity/Stocks removed from the visible tabs (2026-09-17: product
// decision — don't advertise unavailable markets with SOON badges). The
// backend implementations still live (see backendMarkets.ts,
// matching-engine/cmd/engine/markets.go's disabledMarkets, and
// Price-Fetcher's DefaultInstruments); restore their entries here to bring
// the tabs back.
const ASSET_TABS: { id: AssetClass; label: string; icon: any; kinds: MarketKind[]; comingSoon?: boolean }[] = [
  { id: "crypto", label: "Crypto", icon: Bitcoin, kinds: ["spot", "perp"] },
  // { id: "forex", label: "Forex", icon: DollarSign, kinds: ["perp"], comingSoon: true },
  // { id: "commodity", label: "Commodity", icon: Droplet, kinds: ["perp"], comingSoon: true },
  // { id: "stocks", label: "Stocks", icon: Briefcase, kinds: ["perp", "options"], comingSoon: true },
];

const KIND_LABEL: Record<MarketKind, string> = { spot: "Spot", perp: "Future", options: "Options" };

// Options trading is DISABLED (2026-09-11 product decision: crypto
// spot/futures only for the current launch) — the Options sub-tab is now
// HIDDEN entirely (2026-09-17) instead of shown with a •SOON badge, same
// reasoning as the removed forex/commodity/stocks asset tabs above. Options
// is kept in this set so any code path that lands on kind="options" still
// gets the coming-soon blank state rather than an empty list. See
// matching-engine/cmd/engine/markets.go's optionsEnabled flag for the
// backend-side gate; nothing here is deleted.
const COMING_SOON_KINDS = new Set<MarketKind>(["options"]);

export function MarketList({
  activeSymbol,
  onSelect,
  collapsed,
  onToggleCollapse,
  onComingSoonChange,
  kind: controlledKind,
  onKindChange,
}: {
  activeSymbol: string;
  onSelect: (s: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  // Fires whenever the tab/kind the user is currently BROWSING (not
  // necessarily trading) is a coming-soon one, so the trade page can blank
  // its chart and disable the trade panel to match — browsing Forex should
  // visibly do something even though there's nothing to select yet.
  onComingSoonChange?: (comingSoon: boolean) => void;
  // Optional controlled kind ("spot"/"perp"/"options"/"fav"), so the trade
  // page can keep this list's Spot/Future sub-tab in sync with the trade
  // panel's own Spot/Futures tab (selecting either one switches both).
  // Uncontrolled (kind omitted) falls back to internal state, defaulting to
  // "spot" — every other MarketList usage (e.g. a future standalone Markets
  // page) keeps working exactly as before.
  kind?: MarketKind | "fav";
  onKindChange?: (k: MarketKind | "fav") => void;
}) {
  const markets = useMarkets();
  const [asset, setAsset] = useState<AssetClass>("crypto");
  const [uncontrolledKind, setUncontrolledKind] = useState<MarketKind | "fav">("spot");
  const kind = controlledKind ?? uncontrolledKind;
  const setKind = (k: MarketKind | "fav") => {
    setUncontrolledKind(k);
    onKindChange?.(k);
  };
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(markets.filter(m => m.favorite).map(m => m.symbol)));

  const activeAsset = ASSET_TABS.find(a => a.id === asset)!;
  const viewingComingSoon = activeAsset.comingSoon || (kind !== "fav" && COMING_SOON_KINDS.has(kind));

  useEffect(() => {
    onComingSoonChange?.(viewingComingSoon);
  }, [viewingComingSoon, onComingSoonChange]);

  const filtered = useMemo(() => {
    let list = markets.filter(m => m.asset === asset);
    if (kind === "fav") list = list.filter(m => favorites.has(m.symbol));
    else list = list.filter(m => m.category === kind);
    if (query) list = list.filter(m => m.symbol.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [markets, asset, kind, query, favorites]);

  const toggleFav = (sym: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym); else next.add(sym);
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="glass rounded-b-lg rounded-t-none flex h-full flex-col overflow-hidden items-center justify-start py-1.5 gap-1.5">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-primary shrink-0"
          title="Expand market list"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-5 bg-border shrink-0" />
        <div className="flex flex-col items-center gap-1.5">
          {ASSET_TABS.map(a => (
            <button
              key={a.id}
              onClick={() => { setAsset(a.id); onToggleCollapse(); }}
              className={cn(
                "p-1.5 rounded transition-colors shrink-0",
                asset === a.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              title={a.label}
            >
              <a.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-b-xl rounded-t-none flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 space-y-2">
        <div className="flex items-center gap-2 glass-strong px-2 py-1 rounded-md">
          <Search className="h-3 w-3 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            className="h-6 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
          />
        </div>

        {/* Asset class tabs */}
        <div className="grid grid-cols-4 gap-1">
          {ASSET_TABS.map(a => (
            <button
              key={a.id}
              onClick={() => { setAsset(a.id); setKind(a.kinds[0]); }}
              className={cn(
                "relative flex flex-col items-center justify-center py-1.5 rounded text-[9px] font-semibold transition-all gap-0.5",
                asset === a.id
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              <a.icon className="h-3 w-3" />
              {a.label}
              {a.comingSoon && (
                <span className="absolute -top-1 -right-1 px-1 py-px rounded-full bg-warning/90 text-warning-foreground text-[6px] font-bold leading-none">
                  SOON
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sub-tabs (kinds) — hidden for a coming-soon asset class, there's
            nothing tradable to filter by kind yet. */}
        {!activeAsset.comingSoon && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setKind("fav")}
              className={cn(
                "px-2 py-0.5 text-[10px] rounded transition-colors",
                kind === "fav" ? "bg-warning/20 text-warning" : "text-muted-foreground hover:text-warning"
              )}
              title="Favorites"
            >★</button>
            {activeAsset.kinds.map(k => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "relative px-2 py-0.5 text-[10px] rounded transition-colors",
                  kind === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {KIND_LABEL[k]}
                {COMING_SOON_KINDS.has(k) && (
                  <span className="ml-1 text-warning text-[8px] font-bold">•SOON</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewingComingSoon ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <activeAsset.icon className="h-6 w-6 text-muted-foreground/50" />
          <div className="text-xs font-semibold text-foreground">
            {activeAsset.comingSoon ? activeAsset.label : KIND_LABEL[kind as MarketKind]} — Coming Soon
          </div>
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            {activeAsset.comingSoon
              ? `${activeAsset.label} trading isn't live on the exchange yet. Trade Crypto in the meantime.`
              : `${KIND_LABEL[kind as MarketKind]} trading isn't live on the exchange yet. Trade Spot or Futures in the meantime.`}
          </div>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-12 gap-1 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border/50">
        <div className="col-span-7">Pair</div>
        <div className="col-span-5 text-right">Price</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">No markets</div>
        )}
        {filtered.map(m => {
          const isActive = m.symbol === activeSymbol;
          const isFav = favorites.has(m.symbol);
          return (
            <button
              key={m.symbol}
              onClick={() => onSelect(m.symbol)}
              className={cn(
                "w-full grid grid-cols-12 gap-1 px-3 py-1.5 text-xs items-center hover:bg-muted/30 transition-colors group",
                isActive && "bg-primary/10 border-l-2 border-l-primary"
              )}
            >
              <div className="col-span-7 flex items-center gap-1.5 min-w-0">
                <span
                  onClick={(e) => { e.stopPropagation(); toggleFav(m.symbol); }}
                  className={cn("cursor-pointer", isFav ? "text-warning" : "text-muted-foreground/40 hover:text-warning")}
                >
                  <Star className="h-2.5 w-2.5" fill={isFav ? "currentColor" : "none"} />
                </span>
                <div className="text-left min-w-0">
                  <div className="font-semibold truncate">{m.base}</div>
                </div>
              </div>
              <div className="col-span-5 text-right font-mono text-[11px]">{formatPrice(m.price)}</div>
            </button>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
