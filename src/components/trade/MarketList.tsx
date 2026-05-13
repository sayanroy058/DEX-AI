import { useMemo, useState } from "react";
import { useMarkets } from "@/lib/useMarkets";
import { formatCompact, formatPrice, AssetClass, MarketKind } from "@/lib/mockData";
import { Star, Search, ChevronLeft, ChevronRight, Bitcoin, DollarSign, Droplet, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const ASSET_TABS: { id: AssetClass; label: string; icon: any; kinds: MarketKind[] }[] = [
  { id: "crypto", label: "Crypto", icon: Bitcoin, kinds: ["spot", "perp", "options"] },
  { id: "forex", label: "Forex", icon: DollarSign, kinds: ["perp"] },
  { id: "commodity", label: "Commodity", icon: Droplet, kinds: ["perp"] },
  { id: "stocks", label: "Stocks", icon: Briefcase, kinds: ["spot", "perp", "options"] },
];

const KIND_LABEL: Record<MarketKind, string> = { spot: "Spot", perp: "Future", options: "Options" };

export function MarketList({
  activeSymbol,
  onSelect,
  collapsed,
  onToggleCollapse,
}: {
  activeSymbol: string;
  onSelect: (s: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const markets = useMarkets();
  const [asset, setAsset] = useState<AssetClass>("crypto");
  const [kind, setKind] = useState<MarketKind | "fav">("perp");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(markets.filter(m => m.favorite).map(m => m.symbol)));

  const activeAsset = ASSET_TABS.find(a => a.id === asset)!;

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
                "flex flex-col items-center justify-center py-1.5 rounded text-[9px] font-semibold transition-all gap-0.5",
                asset === a.id
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              <a.icon className="h-3 w-3" />
              {a.label}
            </button>
          ))}
        </div>

        {/* Sub-tabs (kinds) */}
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
                "px-2 py-0.5 text-[10px] rounded transition-colors",
                kind === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >{KIND_LABEL[k]}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border/50">
        <div className="col-span-5">Pair</div>
        <div className="col-span-4 text-right">Price</div>
        <div className="col-span-3 text-right">24h%</div>
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
              <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                <span
                  onClick={(e) => { e.stopPropagation(); toggleFav(m.symbol); }}
                  className={cn("cursor-pointer", isFav ? "text-warning" : "text-muted-foreground/40 hover:text-warning")}
                >
                  <Star className="h-2.5 w-2.5" fill={isFav ? "currentColor" : "none"} />
                </span>
                <div className="text-left min-w-0">
                  <div className="font-semibold truncate">{m.base}</div>
                  <div className="text-[9px] text-muted-foreground truncate">Vol {formatCompact(m.volume24h)}</div>
                </div>
              </div>
              <div className="col-span-4 text-right font-mono text-[11px]">{formatPrice(m.price)}</div>
              <div className={cn("col-span-3 text-right font-mono text-[11px] font-semibold", m.change24h >= 0 ? "text-buy" : "text-sell")}>
                {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
